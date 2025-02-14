"use client";
import Navbar from "@/components/Navbar";
import { Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import { DataGrid, GridColDef, GridDensity, GridFilterModel, GridRowsProp, GridRenderCellParams, GridSortModel } from "@mui/x-data-grid"; // Import DataGrid for displaying data
import axios from "axios";
import React, { useEffect, useState } from "react";
import { BiLogoGmail } from "react-icons/bi";
import { FaWhatsapp } from "react-icons/fa"; // WhatsApp, Mail, and Phone icons
import { FcCallback } from "react-icons/fc";
import { ToastContainer } from "react-toastify";
import { io } from "socket.io-client";
import { useToast } from "../ToastContext";

const socket = io("http://localhost:8000");
interface UnpaidInvoice {
  customMessage: string;
  _id: string;
  companyName: string;
  customerName: string;
  contactNumber: string;
  emailAddress: string;
  productName: string;
  remainingAmount: number;
  date: string;
}

const ReminderPage: React.FC = () => {
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const { showToast } = useToast();

  const [selectedInvoice, setSelectedInvoice] = useState<UnpaidInvoice | null>(
    null
  );
  const [customMessage, setCustomMessage] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [density, setDensity] = useState<GridDensity>("standard");
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch unpaid invoices from the backend
        const response = await axios.get(
          "http://localhost:8000/api/v1/invoice/getUnpaidInvoices"
        );
        if (response.data.success) {
          setUnpaidInvoices(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch the data:", error);
        setError("Failed to fetch data. Please try again.");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
    });

    socket.on('reminder', (data) => {
      console.log('Reminder received:', data);
      showToast(
        `Unpaid Invoice Reminder Send to the ${data.customerName}`,
        'success'
      ); // Display the reminder as a toast notification
    });

    // Listen for reminders from the backend
    socket.on("calenderreminder", (data) => {
      console.log("Reminder received:", data);
      showToast(
        ` ${data.event} is scheduled soon!`,
        "success"
      );
    });;

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Cleanup listener on component unmount
    return () => {
      socket.off('connect');
      socket.off('reminder');
      socket.off('disconnect');
    };
  }, [showToast]);

  // Function to handle WhatsApp link generation
  const createWhatsAppLink = (invoiceId: string) => {
    const invoice = unpaidInvoices.find((invoice) => invoice._id === invoiceId);

    if (invoice) {
      const { customerName, remainingAmount, contactNumber } = invoice;

      if (!contactNumber || !customerName || !remainingAmount) {
        console.error("Missing required fields in invoice:", invoice);
        showToast(
          "Required fields are missing. Please check the invoice details.",
          "error"
        );
        return;
      }

      const message = `Hello ${customerName},\n\nThis is a reminder to pay your outstanding invoice of ₹${remainingAmount}. Please make the payment at your earliest convenience.`;
      const encodedMessage = encodeURIComponent(message);
      const whatsAppLink = `https://wa.me/${contactNumber}?text=${encodedMessage}`;

      console.log("Generated WhatsApp Link:", whatsAppLink);

      window.location.href = whatsAppLink;
    } else {
      console.error("Invoice not found for ID:", invoiceId);
      showToast("Invoice not found. Please try again.", "error");
    }
  };

  const openEmailModal = (unpaidInvoice: UnpaidInvoice) => {
    setSelectedInvoice(unpaidInvoice);

    // Check if customMessage is available, otherwise fallback to a default message
    setCustomMessage(
      unpaidInvoice.customMessage ||
      `Dear ${unpaidInvoice.customerName},\n\nThis is a reminder that a payment of ₹${unpaidInvoice.remainingAmount} is still pending. Kindly clear the dues within 5 days.\n\nBest regards,\n${unpaidInvoice.companyName}`
    );

    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!selectedInvoice) return;

    try {
      // Save the custom message first
      await handleSaveMessage();

      // Send the email using the updated customMessage
      await axios.post(
        `http://localhost:8000/api/v1/invoice/sendEmailReminder/${selectedInvoice._id}`,
        { message: customMessage } // Send the updated message
      );

      showToast(
        `Email sent successfully to ${selectedInvoice.emailAddress}!`,
        "success"
      );
      setIsEmailModalOpen(false); // Close the modal
    } catch (error) {
      console.error("Error sending email:", error);
      showToast(
        `Failed to send email to ${selectedInvoice.emailAddress}.`,
        "error"
      );
    }
  };

  const handleSaveMessage = async () => {
    if (!selectedInvoice) return;

    try {
      // Save the custom message in the backend
      const response = await axios.put(
        `http://localhost:8000/api/v1/invoice/updateCustomeMessage/${selectedInvoice._id}`,
        { customMessage }
      );

      // Update the customMessage in state based on the response (optional, to sync state)
      const updatedMessage = response.data.data.customMessage;
      setCustomMessage(updatedMessage);

      showToast("Message saved successfully!", "success");
    } catch (error) {
      console.error("Error saving message:", error);
      showToast("Failed to save message.", "error");
    }
  };

  // Function to handle Call link generation
  const createCallLink = (invoiceId: string) => {
    const invoice = unpaidInvoices.find((invoice) => invoice._id === invoiceId);

    if (invoice) {
      const callLink = `tel:8347745081}`;
      window.location.href = callLink; // Open the phone dialer
    }
  };

  const columns: GridColDef[] = [
    { field: "companyName", headerName: "Company Name", width: 180, align: "left" },
    { field: "customerName", headerName: "Customer Name", width: 200, align: "center" },
    { field: "contactNumber", headerName: "Contact Number", width: 150, align: "center" },
    { field: "emailAddress", headerName: "Email Address", width: 150, align: "center" },
    { field: "productName", headerName: "Product Name", width: 250, align: "left" },
    { field: "totalWithGst", headerName: "Grand Total", width: 250, align: "left" },
    { field: "paidAmount", headerName: "Paid Amount", width: 250, align: "left" },
    { field: "remainingAmount", headerName: "Remaining Amount", width: 250, align: "left" },
    {
      field: "date",
      headerName: "Due Date",
      width: 180,
      align: "center",
      renderCell: (params: GridRenderCellParams<UnpaidInvoice>) => {
        const date = new Date(params.value);
        return isNaN(date.getTime()) ? "Invalid Date" : date.toISOString().split("T")[0];
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 180,
      align: "center",
      renderCell: (params: GridRenderCellParams<UnpaidInvoice>) => (
        <div style={iconContainerStyle}>
          <FcCallback size={30} onClick={() => createCallLink(params.row._id)} />
          <BiLogoGmail size={30} style={{ color: "red" }} onClick={() => openEmailModal(params.row)} />
          <FaWhatsapp size={30} style={{ color: "green" }} onClick={() => createWhatsAppLink(params.row._id)} />
        </div>
      ),
    },
  ];

  return (
    <>
      <Navbar />
      <ToastContainer />
      <Modal open={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: 300, sm: 350, md: 500, lg: 600 },
            bgcolor: "white",
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: "8px",
            boxShadow: 24,
          }}
        >
          <h3 className="text-xl font-semibold mb-4">Sent Email</h3>
          <textarea
            id="message"
            name="message"
            rows={10}
            cols={100}
            required
            value={customMessage} // This will show the updated message
            onChange={(e) => setCustomMessage(e.target.value)} // Handle changes to the message
            className="w-full p-2 text-sm border border-gray-300 rounded-md text-black resize-none"
          />

          <div className="mt-4 flex justify-end gap-2">
            <button
              className="reminderbtn"
              onClick={handleSaveMessage} // Save message button
            >
              Save
            </button>
            <button
              className="reminderbtn"
              onClick={handleSendEmail} // Send email button
            >
              Sent
            </button>
          </div>
        </Box>
      </Modal>

      <h2 className="lead text-3xl font-semibold mb-6 text-center text-black">
        Reminder Management
      </h2>
      {error && <div style={errorStyle}>{error}
      </div>}

      <Box sx={{ height: 600, width: "100%" }}>
        {unpaidInvoices.length > 0 ? (
          <DataGrid
            rows={unpaidInvoices as GridRowsProp}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 20, 30, 40, 50]}
            density={density}
            onDensityChange={(newDensity: GridDensity) => setDensity(newDensity)}
            filterModel={filterModel}
            onFilterModelChange={(model) => setFilterModel(model)}
            sortModel={sortModel || []}
            onSortModelChange={(newSortModel) => setSortModel(newSortModel)}
            checkboxSelection
            disableRowSelectionOnClick
            getRowId={(row) => row._id}
          />
        ) : (
          <Typography variant="h6" align="center" style={{ fontSize: "25px" }}>
            No Reminder Available
          </Typography>
        )}
      </Box>
      <style jsx>{`
        .reminderbtn {
          background-color: #A020F0;
          border-radius: 10px;
          color: white;
          padding: 12px 24px;
          font-size: 1rem;
          font-weight: 500;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reminderbtn:hover {
          background-color: #B95CF4;
        }
      `}</style>
    </>
  );
};

const errorStyle: React.CSSProperties = {
  color: "#d9534f",
  backgroundColor: "#f2dede",
  padding: "15px",
  borderRadius: "8px",
  marginBottom: "20px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "1.5rem",
};

const iconContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "15px",
  marginTop: "1rem",
};

export default ReminderPage;
