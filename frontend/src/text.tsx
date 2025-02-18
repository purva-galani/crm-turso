import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

// Initialize Turso client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create a new complaint
export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("Received body:", body);

    // Validation
    const requiredFields = [
      "complainerName",
      "contactNumber",
      "subject",
      "caseOrigin",
      "date",
      "time", 
      "caseStatus",
      "priority",
    ];
    for (const field of requiredFields) {
      if (!(field in body)) {
        throw new Error(Missing required field: ${field});
      }
    }

    // Insert into database
    const result = await client.execute({
      sql: INSERT INTO complaints (
        complainerName, contactNumber, subject, caseOrigin, date, time, caseStatus, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?),
      args: [
        body.complainerName,
        body.contactNumber,
        body.subject,
        body.caseOrigin,
        body.date,
        body.time,
        body.caseStatus || "Pending",
        body.priority || "Medium",
      ],
    });

    console.log("Insert result:", result);

    return NextResponse.json(
      { id: Number(result.lastInsertRowid), message: "Complaint created successfully" },
      { status: 201 }
    );    
  } catch (error) {
    console.error("Error creating complaint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Get all complaints
export async function GET(request: Request) {
  try {
    const result = await client.execute({
      sql: "SELECT * FROM complaints",
      args: [], // Add empty args array
    });

    return NextResponse.json(
      { success: true, complaints: result.rows },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Get a specific complaint by ID
export async function GET_BY_ID(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const result = await client.execute({
      sql: "SELECT * FROM complaints WHERE id = ?",
      args: [parseInt(id)],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Complaint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, complaint: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching complaint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Update a specific complaint by ID
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    const result = await client.execute({
      sql: UPDATE complaints SET 
        contact_number = ?, case_status = ?, case_origin = ?, subject = ?, priority = ?, date = ?, time = ?, complainer_name = ?
        WHERE id = ?,
      args: [
        body.contactNumber,
        body.caseStatus,
        body.caseOrigin,
        body.subject,
        body.priority,
        body.date,
        body.time,
        body.complainerName,
        parseInt(id),
      ],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json(
        { success: false, message: "Complaint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Complaint updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating complaint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Delete a specific complaint by ID
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const result = await client.execute({
      sql: "DELETE FROM complaints WHERE id = ?",
      args: [parseInt(id)],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json(
        { success: false, message: "Complaint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Complaint deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting complaint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}













// "use client";
// import Navbar from "@/components/Navbar";
// import React, { useState, useEffect, useCallback } from "react";
// import axios from "axios";
// import { useToast } from "../ToastContext";
// import { CiEdit } from "react-icons/ci";
// import { MdCancel, MdContactPhone, MdDelete } from "react-icons/md";
// import { IoMdList, IoMdTime } from "react-icons/io";
// import { Button } from "@nextui-org/react";
// import { Box, Typography } from "@mui/material";
// import { DataGrid, GridRenderCellParams } from "@mui/x-data-grid";
// import { io } from 'socket.io-client';

// const socket = io('http://localhost:8000');

// interface Complaint {
//   _id: string;
//   complainerName: string;
//   contactNumber: string;
//   caseStatus: string;
//   caseOrigin: string;
//   subject: string;
//   priority: string;
//   date: string;
//   time: string;
// }

// const ComplaintPage: React.FC = () => {
//   const [complaints, setComplaints] = useState<Complaint[]>([]);
//   const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
//   const [formData, setFormData] = useState<Complaint>({
//     _id: "",
//     complainerName: "",
//     contactNumber: "",
//     caseStatus: "Pending",
//     caseOrigin: "",
//     subject: "",
//     priority: "Medium",
//     date: "",
//     time: "",
//   });
//   const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
//   const [isEditing, setIsEditing] = useState<boolean>(false);
//   const [isFormVisible, setIsFormVisible] = useState(false);
//   const [showResolved, setShowResolved] = useState<boolean>(false);
//   const { showToast } = useToast();

//   const fetchComplaints = useCallback(async () => {
//     try {
//       const response = await axios.get(
//         "http://localhost:8000/api/v1/complaint/getAllComplaints"
//       );
//       setComplaints(response.data.complaints || []);
//     } catch (error) {
//       console.error("Error fetching complaints:", error);
//     }
//   }, []); 

//   useEffect(() => {
//     if (showResolved) {
//       setFilteredComplaints(
//         complaints.filter((complaint) => complaint.caseStatus === "Resolved")
//       );
//     } else {
//       setFilteredComplaints(
//         complaints.filter((complaint) => complaint.caseStatus !== "Resolved")
//       );
//     }
//   }, [showResolved, complaints]);

//   useEffect(() => {
//     socket.on('connect', () => {
//       console.log('Connected to server:', socket.id);
//     });

//     socket.on('reminder', (data) => {
//       console.log('Reminder received:', data);
//       showToast(
//         `Unpaid Invoice Reminder Send to the ${data.customerName}`,
//         'success'
//       );
//     });

//     socket.on("calenderreminder", (data) => {
//       console.log("Reminder received:", data);
//       showToast(
//         ` ${data.event} is scheduled soon!`,
//         "success"
//       );
//     });

//     socket.on('disconnect', () => {
//       console.log('Disconnected from server');
//     });

//     return () => {
//       socket.off('connect');
//       socket.off('reminder');
//       socket.off('disconnect');
//     };
//   }, [showToast]);

//   useEffect(() => {
//     fetchComplaints();
//   }, [fetchComplaints]);

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
//   ) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);

//     try {
//       if (isEditing) {
//         await axios.put(
//           `http://localhost:8000/api/v1/complaint/updateComplaint/${formData._id}`,
//           formData
//         );
//         showToast("Complaint updated successfully!", "success");
//       } else {
//         await axios.post(
//           "http://localhost:8000/api/v1/complaint/createComplaint",
//           formData
//         );
//         showToast("Complaint created successfully!", "success");
//       }

//       setFormData({
//         _id: "",
//         complainerName: "",
//         contactNumber: "",
//         caseStatus: "Pending",
//         caseOrigin: "",
//         subject: "",
//         priority: "Medium",
//         date: "",
//         time: "",
//       });
//       setIsSubmitting(false);
//       setIsEditing(false);
//       setIsFormVisible(false);
//       fetchComplaints();
//     } catch (error) {
//       console.error("Failed to save complaint.", error);
//       showToast("Failed to save complaint.", "error");
//       setIsSubmitting(false);
//     }
//   };

//   const handleEdit = (complaint: Complaint) => {
//     setFormData(complaint);
//     setIsEditing(true);
//     setIsFormVisible(true);
//   };

//   const handleDelete = async (id: string) => {
//     try {
//       await axios.delete(
//         `http://localhost:8000/api/v1/complaint/deleteComplaint/${id}`
//       );
//       fetchComplaints();
//       showToast("Complaint deleted successfully!", "success");
//     } catch (error) {
//       console.error("Error updating complaint:", error); 
//       showToast("Failed to delete complaint.", "error");
//     }
//   };

//   const columns = [
//     { field: "complainerName", headerName: "Customer Name", flex: 1 },
//     { field: "contactNumber", headerName: "Contact Number", flex: 1 },
//     { field: "subject", headerName: "Subject", flex: 1 },
//     { field: "caseStatus", headerName: "Case Status", flex: 1 },
//     { field: "priority", headerName: "Priority", flex: 1 },
//     { field: "date", headerName: "Date", flex: 1 },
//     { field: "time", headerName: "Time", flex: 1 },
//     {
//       field: "action",
//       headerName: "Action",
//       flex: 1,
//       renderCell: (params: GridRenderCellParams) => (
//         <div className="flex justify-center items-center gap-3">
//           <button
//             className="p-2 text-green-600  rounded hover:bg-green-200"
//             onClick={() => handleEdit(params.row)}
//             aria-label="Edit Contact"
//           >
//             <CiEdit size={18} />
//           </button>
//           <button
//             className="p-2 text-red-600  rounded hover:bg-red-100"
//             onClick={() => handleDelete(params.row._id)}
//             aria-label="Delete Contact"
//           >
//             <MdDelete size={18} />
//           </button>
//         </div>
//       ),
//     },
//   ];

//   return (
//     <div className="flex flex-col items-center justify-center bg-white py-4">
//       <Navbar />
//       <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
//         Contact Record
//       </h2>
//       <div className=" mb-4">
//         <Button
//           className="contactbtn shadow-[0_4px_14px_0_rgb(162,0,255,39%)] hover:shadow-[0_6px_20px_rgba(162,0,255,50%)] hover:bg-[rgba(162, 0, 255, 0.9)] px-8 py-2 bg-purple-500 rounded-md text-white font-light transition duration-200 ease-linear"
//           color="primary"
//           onClick={() => {
//             setFormData({
//               _id: "",
//               complainerName: "",
//               contactNumber: "",
//               caseStatus: "",
//               caseOrigin: "",
//               subject: "",
//               priority: "Medium",
//               date: "",
//               time: "",
//             });
//             setIsEditing(false);
//             setIsFormVisible(true);
//           }}
//         >
//           Add Complaint
//           <MdContactPhone
//             style={{ height: "20px", width: "20px", color: "#ff9b31" }}
//           />
//         </Button>
//       </div>

//       <div className="mb-5">
//         <button
//           className="py-2 px-6 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
//           onClick={() => setShowResolved(!showResolved)}
//         >
//           {showResolved ? (
//             <IoMdList className="text-white" />
//           ) : (
//             <IoMdTime className="text-white" />
//           )}
//         </button>
//       </div>

//       {isFormVisible && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-opacity-50">
//           <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-2xl">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-xl font-semibold text-gray-800">
//                 {isEditing ? "Edit Complaint" : "Add Complaint"}
//               </h3>
//               <button
//                 type="button"
//                 onClick={() => setIsFormVisible(false)}
//                 className="text-gray-600 hover:text-red-500"
//               >
//                 <MdCancel size={24} />
//               </button>
//             </div>

//             <form onSubmit={handleSubmit} className="space-y-4 p-6 w-full">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="label block text-sm font-medium text-gray-700 mb-2">
//                     Customer Name
//                   </label>
//                   <input
//                     type="text"
//                     placeholder="Enter Your Name"
//                     name="complainerName"
//                     value={formData.complainerName}
//                     onChange={handleChange}
//                     className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
//                     required
//                   />
//                 </div>

//                 <div>
//                   <label className="label block text-sm font-medium text-gray-700 mb-2">
//                     Contact Details
//                   </label>
//                   <input
//                     type="text"
//                     placeholder="Enter Your Contact Number"
//                     name="contactNumber"
//                     value={formData.contactNumber}
//                     onChange={handleChange}
//                     className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
//                     required
//                   />
//                 </div>

//                 <div>
//                   <label className="label block text-sm font-medium text-gray-700 mb-2">
//                     Subject
//                   </label>
//                   <input
//                     type="text"
//                     placeholder="Enter Your Subject"
//                     name="subject"
//                     value={formData.subject}
//                     onChange={handleChange}
//                     className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
//                     required
//                   />
//                 </div>

//                 <div>
//                   <label className="label block text-sm font-medium text-gray-700 mb-2">
//                     Problem
//                   </label>
//                   <input
//                     type="text"
//                     placeholder="Enter Your Problem"
//                     name="caseOrigin"
//                     value={formData.caseOrigin}
//                     onChange={handleChange}
//                     className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
//                     required
//                   />
//                 </div>

//                 <div>
//                   <label className="label block text-sm font-medium text-gray-700 mb-2">
//                     Date
//                   </label>
//                   <input
//                     type="date"
//                     name="date"
//                     value={formData.date}
//                     onChange={handleChange}
//                     className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
//                     required
//                   />
//                 </div>

//                 <div>
//                   <label className="label block text-sm font-medium text-gray-700 mb-2">
//                     Time
//                   </label>
//                   <input
//                     type="time"
//                     name="time"
//                     value={formData.time}
//                     onChange={handleChange}
//                     className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
//                     required
//                   />
//                 </div>

//                 <div>
//                   <label className="label block text-sm font-medium text-gray-700 mb-2">
//                     Status
//                   </label>
//                   <select
//                     name="caseStatus"
//                     value={formData.caseStatus}
//                     onChange={handleChange}
//                     className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
//                   >
//                     <option value="Pending">Pending</option>
//                     <option value="Resolved">Resolved</option>
//                     <option value="In Progress">In Progress</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label className="label block text-sm font-medium text-gray-700 mb-2">
//                     Priority
//                   </label>
//                   <select
//                     name="priority"
//                     value={formData.priority}
//                     onChange={handleChange}
//                     className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
//                   >
//                     <option value="High">High</option>
//                     <option value="Medium">Medium</option>
//                     <option value="Low">Low</option>
//                   </select>
//                 </div>
//               </div>

//               <div className="text-center">
//                 <button
//                   type="submit"
//                   className="label py-2 px-6 bg-purple-500 text-white rounded-md hover:bg-purple-600"
//                   disabled={isSubmitting}
//                 >
//                   {isSubmitting
//                     ? "Submitting..."
//                     : isEditing
//                     ? "Update Complaint"
//                     : "Add Complaint"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {filteredComplaints.length === 0 ? (
//         <div className="text-center py-4 text-gray-600">
//           No Complaints available
//         </div>
//       ) : (
//         <Box sx={{ height: 600, width: "100%" }}>
//           {complaints.length > 0 ? (
//             <DataGrid
//               rows={filteredComplaints}
//               columns={columns}
//               getRowId={(row) => row._id}
//               initialState={{
//                 pagination: {
//                   paginationModel: {
//                     pageSize: 10,
//                   },
//                 },
//               }}
//               pageSizeOptions={[5]}
//               disableRowSelectionOnClick
//             />
//           ) : (
//             <Typography variant="h6" align="center">
//               No Complaints Available.
//             </Typography>
//           )}
//         </Box>
//       )}
//     </div>
//   );
// };

// export default ComplaintPage;









// // "use client";
// // import Navbar from "@/components/Navbar";
// // import React, { useState, useEffect, useCallback } from "react";
// // import axios from "axios";
// // import { useToast } from "../ToastContext";
// // import { CiEdit } from "react-icons/ci";
// // import { MdCancel, MdContactPhone, MdDelete } from "react-icons/md";
// // import { IoMdList, IoMdTime } from "react-icons/io";
// // import { Button } from "@nextui-org/react";
// // import { Box, Typography } from "@mui/material";
// // import { DataGrid, GridRenderCellParams } from "@mui/x-data-grid";
// // import { io } from 'socket.io-client';

// // const socket = io('http://localhost:8000');

// // interface Complaint {
// //   id: number; // Changed from _id (MongoDB) to id (Turso)
// //   complainerName: string;
// //   contactNumber: string;
// //   caseStatus: string;
// //   caseOrigin: string;
// //   subject: string;
// //   priority: string;
// //   date: string;
// //   time: string;
// // }

// // const ComplaintPage: React.FC = () => {
// //   const [complaints, setComplaints] = useState<Complaint[]>([]);
// //   const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
// //   const [formData, setFormData] = useState<Complaint>({
// //     id: 0, // Changed from _id to id
// //     complainerName: "",
// //     contactNumber: "",
// //     caseStatus: "Pending",
// //     caseOrigin: "",
// //     subject: "",
// //     priority: "Medium",
// //     date: "",
// //     time: "",
// //   });
// //   const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
// //   const [isEditing, setIsEditing] = useState<boolean>(false);
// //   const [isFormVisible, setIsFormVisible] = useState(false);
// //   const [showResolved, setShowResolved] = useState<boolean>(false);
// //   const { showToast } = useToast();

// //   const fetchComplaints = useCallback(async () => {
// //     try {
// //       const response = await axios.get("/api/complaints"); // Updated endpoint
// //       setComplaints(response.data.complaints || []);
// //     } catch (error) {
// //       console.error("Error fetching complaints:", error);
// //     }
// //   }, []);

// //   useEffect(() => {
// //     if (showResolved) {
// //       setFilteredComplaints(
// //         complaints.filter((complaint) => complaint.caseStatus === "Resolved")
// //       );
// //     } else {
// //       setFilteredComplaints(
// //         complaints.filter((complaint) => complaint.caseStatus !== "Resolved")
// //       );
// //     }
// //   }, [showResolved, complaints]);

// //   useEffect(() => {
// //     socket.on('connect', () => {
// //       console.log('Connected to server:', socket.id);
// //     });

// //     socket.on('reminder', (data) => {
// //       console.log('Reminder received:', data);
// //       showToast(
// //         `Unpaid Invoice Reminder Sent to ${data.customerName}`,
// //         'success'
// //       );
// //     });

// //     socket.on("calenderreminder", (data) => {
// //       console.log("Reminder received:", data);
// //       showToast(
// //         ` ${data.event} is scheduled soon!`,
// //         "success"
// //       );
// //     });

// //     socket.on('disconnect', () => {
// //       console.log('Disconnected from server');
// //     });

// //     return () => {
// //       socket.off('connect');
// //       socket.off('reminder');
// //       socket.off('disconnect');
// //     };
// //   }, [showToast]);

// //   useEffect(() => {
// //     fetchComplaints();
// //   }, [fetchComplaints]);

// //   const handleChange = (
// //     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
// //   ) => {
// //     const { name, value } = e.target;
// //     setFormData((prev) => ({
// //       ...prev,
// //       [name]: value,
// //     }));
// //   };

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     setIsSubmitting(true);

// //     try {
// //       if (isEditing) {
// //         await axios.put(`/api/complaints`, formData); // Updated endpoint
// //         showToast("Complaint updated successfully!", "success");
// //       } else {
// //         await axios.post("/api/complaints", formData); // Updated endpoint
// //         showToast("Complaint created successfully!", "success");
// //       }

// //       setFormData({
// //         id: 0,
// //         complainerName: "",
// //         contactNumber: "",
// //         caseStatus: "Pending",
// //         caseOrigin: "",
// //         subject: "",
// //         priority: "Medium",
// //         date: "",
// //         time: "",
// //       });
// //       setIsSubmitting(false);
// //       setIsEditing(false);
// //       setIsFormVisible(false);
// //       fetchComplaints();
// //     } catch (error) {
// //       console.error("Failed to save complaint.", error);
// //       showToast("Failed to save complaint.", "error");
// //       setIsSubmitting(false);
// //     }
// //   };

// //   const handleEdit = (complaint: Complaint) => {
// //     setFormData(complaint);
// //     setIsEditing(true);
// //     setIsFormVisible(true);
// //   };

// //   const handleDelete = async (id: number) => {
// //     try {
// //       await axios.delete(`/api/complaints?id=${id}`); // Updated endpoint
// //       fetchComplaints();
// //       showToast("Complaint deleted successfully!", "success");
// //     } catch (error) {
// //       console.error("Error deleting complaint:", error);
// //       showToast("Failed to delete complaint.", "error");
// //     }
// //   };

// //   const columns = [
// //     { field: "complainerName", headerName: "Customer Name", flex: 1 },
// //     { field: "contactNumber", headerName: "Contact Number", flex: 1 },
// //     { field: "subject", headerName: "Subject", flex: 1 },
// //     { field: "caseStatus", headerName: "Case Status", flex: 1 },
// //     { field: "priority", headerName: "Priority", flex: 1 },
// //     { field: "date", headerName: "Date", flex: 1 },
// //     { field: "time", headerName: "Time", flex: 1 },
// //     {
// //       field: "action",
// //       headerName: "Action",
// //       flex: 1,
// //       renderCell: (params: GridRenderCellParams) => (
// //         <div className="flex justify-center items-center gap-3">
// //           <button
// //             className="p-2 text-green-600 rounded hover:bg-green-200"
// //             onClick={() => handleEdit(params.row)}
// //             aria-label="Edit Contact"
// //           >
// //             <CiEdit size={18} />
// //           </button>
// //           <button
// //             className="p-2 text-red-600 rounded hover:bg-red-100"
// //             onClick={() => handleDelete(params.row.id)} // Changed from _id to id
// //             aria-label="Delete Contact"
// //           >
// //             <MdDelete size={18} />
// //           </button>
// //         </div>
// //       ),
// //     },
// //   ];

// //   return (
// //     <div className="flex flex-col items-center justify-center bg-white py-4">
// //       <Navbar />
// //       <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
// //         Contact Record
// //       </h2>
// //       <div className="mb-4">
// //         <Button
// //           className="contactbtn shadow-[0_4px_14px_0_rgb(162,0,255,39%)] hover:shadow-[0_6px_20px_rgba(162,0,255,50%)] hover:bg-[rgba(162, 0, 255, 0.9)] px-8 py-2 bg-purple-500 rounded-md text-white font-light transition duration-200 ease-linear"
// //           color="primary"
// //           onClick={() => {
// //             setFormData({
// //               id: 0,
// //               complainerName: "",
// //               contactNumber: "",
// //               caseStatus: "Pending",
// //               caseOrigin: "",
// //               subject: "",
// //               priority: "Medium",
// //               date: "",
// //               time: "",
// //             });
// //             setIsEditing(false);
// //             setIsFormVisible(true);
// //           }}
// //         >
// //           Add Complaint
// //           <MdContactPhone
// //             style={{ height: "20px", width: "20px", color: "#ff9b31" }}
// //           />
// //         </Button>
// //       </div>

// //       <div className="mb-5">
// //         <button
// //           className="py-2 px-6 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
// //           onClick={() => setShowResolved(!showResolved)}
// //         >
// //           {showResolved ? (
// //             <IoMdList className="text-white" />
// //           ) : (
// //             <IoMdTime className="text-white" />
// //           )}
// //         </button>
// //       </div>

// //       {isFormVisible && (
// //         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-opacity-50">
// //           <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-2xl">
// //             <div className="flex items-center justify-between mb-4">
// //               <h3 className="text-xl font-semibold text-gray-800">
// //                 {isEditing ? "Edit Complaint" : "Add Complaint"}
// //               </h3>
// //               <button
// //                 type="button"
// //                 onClick={() => setIsFormVisible(false)}
// //                 className="text-gray-600 hover:text-red-500"
// //               >
// //                 <MdCancel size={24} />
// //               </button>
// //             </div>

// //             <form onSubmit={handleSubmit} className="space-y-4 p-6 w-full">
// //               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
// //                 {/* Form fields remain the same */}
// //               </div>

// //               <div className="text-center">
// //                 <button
// //                   type="submit"
// //                   className="label py-2 px-6 bg-purple-500 text-white rounded-md hover:bg-purple-600"
// //                   disabled={isSubmitting}
// //                 >
// //                   {isSubmitting
// //                     ? "Submitting..."
// //                     : isEditing
// //                     ? "Update Complaint"
// //                     : "Add Complaint"}
// //                 </button>
// //               </div>
// //             </form>
// //           </div>
// //         </div>
// //       )}

// //       {filteredComplaints.length === 0 ? (
// //         <div className="text-center py-4 text-gray-600">
// //           No Complaints available
// //         </div>
// //       ) : (
// //         <Box sx={{ height: 600, width: "100%" }}>
// //           {complaints.length > 0 ? (
// //             <DataGrid
// //               rows={filteredComplaints}
// //               columns={columns}
// //               getRowId={(row) => row.id} // Changed from _id to id
// //               initialState={{
// //                 pagination: {
// //                   paginationModel: {
// //                     pageSize: 10,
// //                   },
// //                 },
// //               }}
// //               pageSizeOptions={[5]}
// //               disableRowSelectionOnClick
// //             />
// //           ) : (
// //             <Typography variant="h6" align="center">
// //               No Complaints Available.
// //             </Typography>
// //           )}
// //         </Box>
// //       )}
// //     </div>
// //   );
// // };

// // export default ComplaintPage;




