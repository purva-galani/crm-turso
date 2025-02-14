"use client";

import Navbar from "@/components/Navbar";
import { Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import { DataGrid, GridColDef, GridDensity, GridFilterModel, GridSortModel, GridRenderCellParams } from "@mui/x-data-grid";
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger} from "@nextui-org/react";
import axios from "axios";
import React, { useEffect, useState, useCallback } from "react";
import { BiLogoGmail } from "react-icons/bi";
import { FaEdit, FaWhatsapp } from "react-icons/fa";
import { FcCallback, FcDeleteDatabase} from "react-icons/fc";
import { GrContactInfo } from "react-icons/gr";
import { MdCancel } from "react-icons/md";
import { useToast } from "../ToastContext";

import { io} from 'socket.io-client';
const socket = io('http://localhost:8000');

interface Contact {
  _id: string;
  companyName: string;
  customerName: string;
  contactNumber: string;
  emailAddress: string;
  address: string;
  gstNumber: string;
  description: string;
}

const ContactPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState<Contact>({
    _id: "",
    companyName: "",
    customerName: "",
    contactNumber: "",
    emailAddress: "",
    address: "",
    gstNumber: "",
    description: "",
  });
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [customMessage, setCustomMessage] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(0);
  const [density, setDensity] = useState<GridDensity>('comfortable');
  const [filterModel, setFilterModel] = useState<GridFilterModel>({
    items: [],
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);


  const fetchContacts = useCallback(async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/v1/contact/getAllContacts"
      );
      setContacts(response.data.data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      showToast("Failed to fetch contacts!", "error");
    }
  }, [showToast]);
  
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

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

  const handleEdit = (contact: Contact) => {
    setEditContact(contact);
    setNewContact({ ...contact });
    setIsFormVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(
        `http://localhost:8000/api/v1/contact/deleteContact/${id}`
      );
      fetchContacts();
      showToast("Contact deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting contact:", error);
      setError("Failed to delete contact.");
      showToast("Failed to delete contact!", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = newContact._id
        ? `http://localhost:8000/api/v1/contact/updateContact/${newContact._id}`
        : "http://localhost:8000/api/v1/contact/createContact";
      const method = newContact._id ? axios.put : axios.post;
      await method(url, newContact);
      showToast(
        `Contact ${newContact._id ? "updated" : "created"} successfully!`,
        "success"
      );
      if (!newContact._id) {
        setContacts([...contacts, newContact]);
      } else {
        setContacts(
          contacts.map((contact) =>
            contact._id === newContact._id ? newContact : contact
          )
        );
      }
      setNewContact({
        _id: "",
        companyName: "",
        customerName: "",
        contactNumber: "",
        emailAddress: "",
        address: "",
        gstNumber: "",
        description: "",
      });
      fetchContacts();
      setIsFormVisible(false);
    } catch (error) {
      console.error("Error saving contact:", error);
      showToast("Failed to save contact!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createWhatsAppLink = (contact: Contact) => {
    if (!contact || !contact.contactNumber) {
      alert("Contact information or phone number is missing.");
      return;
    }
    const phoneNumber = contact.contactNumber.startsWith("91")
      ? contact.contactNumber
      : `91${contact.contactNumber}`;
    const validPhoneNumber = phoneNumber.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(validPhoneNumber)) {
      alert("Invalid phone number.");
      return;
    }
    let message;
    if (contact.customerName) {
      message = `Hello ${contact.customerName},\n\nThis is a reminder to pay your outstanding invoice. Please make the payment at your earliest convenience.`;
    } else {
      message = `Hello,\n\nThis is a reminder to pay your outstanding invoice.`;
    }
    const encodedMessage = encodeURIComponent(message);
    const whatsAppLink = `https://wa.me/${validPhoneNumber}?text=${encodedMessage}`;
    window.location.href = whatsAppLink;
  };

  const createCallLink = (contactNumber: string) => {
    const validPhoneNumber = contactNumber.replace(/\D/g, "");
    if (!/^\+?\d{10,15}$/.test(validPhoneNumber)) {
      alert("Invalid phone number.");
      return;
    }
    window.location.href = `tel:${validPhoneNumber}`;
  };

  const openEmailModal = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!selectedContact) return;
    try {
      await axios.post(
        `http://localhost:8000/api/v1/contact/sendEmailReminder/${selectedContact._id}`,
        { message: customMessage }
      );
      showToast(
        `Email sent successfully to ${selectedContact.emailAddress}!`,
        "success"
      );
      setIsEmailModalOpen(false);
    } catch (error) {
      console.error("Error sending email:", error);
      showToast(
        `Failed to send email to ${selectedContact.emailAddress}.`,
        "error"
      );
    }
  };

  const columns: GridColDef[] = [
    { field: "companyName", headerName: "Company Name", width: 180, align: "left", type: 'string' },
    { field: "customerName", headerName: "Email", width: 200, align: "center", type: 'string' },
    { field: "contactNumber", headerName: "Contact Number", width: 150, align: "center", type: 'string' },
    { field: "emailAddress", headerName: "Email Address", width: 150, align: "center", type: 'string' },
    { field: "address", headerName: "Address", width: 250, align: "left", type: 'string' },
    { field: "gstNumber", headerName: "GST Number", width: 250, align: "left", type: 'string' },
    { field: "description", headerName: "Description", width: 250, align: "left", type: 'string' },

    {
      field: "action", headerName: "Actions", width: 250, align: "center", type: 'string',
      renderCell: (params: GridRenderCellParams<Contact>) => (
        <div className="relative flex justify-center items-center gap-5">
          <button
            className="p-2"
            style={{ color: "#647c90" }}
            onClick={() => handleEdit(params.row)}
            aria-label="Edit Contact"
          >
            <FaEdit size={20} />
          </button>
          <button
            className="p-2"
            onClick={() => handleDelete(params.row._id)}
            aria-label="Delete Contact"
          >
            <FcDeleteDatabase size={20} />
          </button>
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                size="sm"
                variant="solid"
                className="text-black transition-all duration-150"
              >
                <GrContactInfo size={30} style={{ color: '#647c90' }} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu className="bg-white border border-gray-300 shadow-lg rounded-md py-2 w-30">
              <DropdownItem
                key="call"
                onClick={() => createCallLink(params.row.contactNumber)}
              >
                <FcCallback size={30} />
              </DropdownItem>
              <DropdownItem
                key="mail"
                onClick={() => openEmailModal(params.row)}
              >
                <BiLogoGmail size={30} style={{ color: 'red' }} />
              </DropdownItem>
              <DropdownItem
                key="whatsup"
                onClick={() => createWhatsAppLink(params.row)}
              >
                <FaWhatsapp size={30} style={{ color: 'green' }} />
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      ),
    },
  ];

  const rowsWithId = contacts.map(contact => ({
    ...contact,
    id: contact._id,
  }));
  
  return (
    <div className="lead flex flex-col items-center justify-center bg-white py-4">
      <Navbar />
      <h2 className="text-3xl font-semibold mb-6 text-center text-black">
        Contact Management
      </h2>
      <div className="mb-4 flex items-center justify-between gap-4 w-50 max-w-4xl px-4">
        {/* <div className="flex-grow">
          <Input
            placeholder="Find your data"
            startContent={<FcSearch />}
            size="sm"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div> */}
        <button
          className="contactbtn" color="primary"
          onClick={() => {
            setNewContact({
              _id: "",
              companyName: "",
              customerName: "",
              contactNumber: "",
              emailAddress: "",
              address: "",
              gstNumber: "",
              description: "",
            });
            setEditContact(null); // Reset editContact
            setIsFormVisible(true); // Toggle form visibility
          }}
        >
          Create
        </button>
      </div>

      {isFormVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-opaq-sm">
          <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-black mb-4">
                {editContact ? "Update Contact" : "Create Contact"}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormVisible(false)}
                className="text-gray-600 hover:text-red-500"
              >
                <MdCancel size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-container w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label block text-sm font-bold text-gray-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    placeholder="Enter Company Name"
                    value={newContact.companyName}
                    onChange={(e) =>
                      setNewContact({
                        ...newContact,
                        companyName: e.target.value,
                      })
                    }
                    className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>
                <div>
                  <label className="label block text-sm font-bold text-gray-700 mb-2">Customer Name</label>
                  <input
                    type="text"
                    name="customerName"
                    placeholder="Enter Customer Name"
                    value={newContact.customerName}
                    onChange={(e) =>
                      setNewContact({
                        ...newContact,
                        customerName: e.target.value,
                      })
                    }
                    className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>
                <div>
                  <label className="label block text-sm font-bold text-gray-700 mb-2">Contact Number</label>
                  <input
                    type="number"
                    name="contactNumber"
                    placeholder="Enter Contact Number"
                    value={newContact.contactNumber}
                    onChange={(e) =>
                      setNewContact({
                        ...newContact,
                        contactNumber: e.target.value,
                      })
                    }
                    className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>
                <div>
                  <label className="label block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    name="emailAddress"
                    placeholder="Enter Email Address"
                    value={newContact.emailAddress}
                    onChange={(e) =>
                      setNewContact({
                        ...newContact,
                        emailAddress: e.target.value,
                      })
                    }
                    className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>
                <div>
                  <label className="label block text-sm font-bold text-gray-700 mb-2">Company Address</label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Enter Company Address"
                    value={newContact.address}
                    onChange={(e) =>
                      setNewContact({ ...newContact, address: e.target.value })
                    }
                    className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
                  />
                </div>
                <div>
                  <label className="label block text-sm font-bold text-gray-700 mb-2">GST Number</label>
                  <input
                    type="text"
                    name="gstNumber"
                    placeholder="Enter GST Number"
                    value={newContact.gstNumber}
                    onChange={(e) =>
                      setNewContact({
                        ...newContact,
                        gstNumber: e.target.value,
                      })
                    }
                    className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="label block text-sm font-bold text-gray-700 mb-2">Notes</label>
                  <textarea
                    name="description"
                    value={newContact.description}
                    placeholder="Enter Other Details"
                    onChange={(e) =>
                      setNewContact({
                        ...newContact,
                        description: e.target.value,
                      })
                    }
                    className="label w-full p-2 text-sm border border-gray-300 rounded-md text-black resize-none"
                    rows={3}
                  ></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-4">
                <button
                  type="submit"
                  className="contactbtn" disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Submitting..."
                    : editContact
                      ? "Update"
                      : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
  .form-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .label {
    font-size: 0.875rem; /* 14px */
    font-weight: bold;
    color: #4a5568; /* gray-700 */
  }

  .input-field {
    padding: 10px;
    font-size: 0.875rem; /* 14px */
    border: 1px solid #e2e8f0; /* gray-300 */
    border-radius: 8px;
    color: #1a202c; /* black */
    width: 100%;
    box-sizing: border-box;
  }

  .input-field:focus {
    border-color: #a200ff; /* purple-500 */
    outline: none;
  }

  .contactbtn {
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

  .contactbtn:hover {
    background-color: #B95CF4;
  }

  /* Media Queries */
  @media (max-width: 640px) {
    .form-container {
      max-height: 400px; /* Set a max-height to avoid it growing too long */
      overflow-y: auto; /* Enable vertical scrolling when form exceeds max height */
    }

    .label {
      font-size: 0.75rem; /* 12px */
    }

    .input-field {
      font-size: 0.75rem; /* 12px */
    }

    .contactbtn {
      font-size: 0.75rem; /* 12px */
    }
  }

  @media (max-width: 500px) {
    .form-container {
      max-height: 400px; /* Prevent form from becoming too tall */
      overflow-y: auto; /* Enable scrolling */
    }
  }

  @media (max-width: 300px) {
    .label {
      font-size: 14px; /* 12px */
    }

    .input-field {
      font-size: 14px; /* 12px */
    }

    .contactbtn {
      font-size: 14px; /* 12px */
    }
  }

  @media (max-width: 1024px) {
    .form-container {
      gap: 12px;
    }

    .input-field {
      font-size: 0.875rem; /* 14px */
    }
  }
 
@media (max-width: 700px) {
  .contactbtn .hidden.md\:inline {
    display: none;
     
  }

  .contactbtn .inline.md\:hidden {
    display: inline; 
  }
}
`}</style>

      {
        error && (
          <div className="mt-4 text-red-600 text-sm text-center">{error}</div>
        )
      }

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
          <h3
            className="text-xl sm:text-lg md:text-xl font-semibold mb-4"
            style={{ fontSize: "1.25rem" }}
          >
            Sent Email
          </h3>
          <textarea
            id="message"
            name="message"
            rows={10}
            cols={100}
            required
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full p-2 text-sm sm:text-xs md:text-sm border border-gray-300 rounded-md text-black resize-none"
            style={{
              fontSize: "1rem",
              padding: "0.5rem",
            }}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="contactbtn" onClick={handleSendEmail}
              style={{
                padding: "0.5rem 1rem",
              }}
            >
              Sent
            </button>
          </div>
        </Box>
      </Modal>

      <Box sx={{ height: 600, width: "100%" }}>
        {contacts.length > 0 ? (
          <DataGrid
            rows={rowsWithId}
            columns={columns}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            pagination
            pageSizeOptions={[5, 10, 20, 30, 40, 50]}
            
            density={density}
            checkboxSelection
            onDensityChange={(newDensity) => setDensity(newDensity)}
            filterModel={filterModel}
            onFilterModelChange={(model) => setFilterModel(model)}
            sortModel={sortModel}
            onSortModelChange={(newSortModel) => setSortModel(newSortModel)}
            disableRowSelectionOnClick
          />
        ) : (
          <Typography variant="h6" align="center" style={{ fontSize: "25px" }}>
            No Contact Available
          </Typography>
        )}
      </Box>
    </div >
  );
};

export default ContactPage;
