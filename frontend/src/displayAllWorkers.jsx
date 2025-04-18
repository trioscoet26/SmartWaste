import { useEffect, useState } from "react";
import { Edit, Trash2 } from "lucide-react";

const DisplayAllWorkers = () => {
  const url = import.meta.env.VITE_API_URL;
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);

  // Fetch worker data from the backend API
  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const response = await fetch(`${url}worker`);
      if (!response.ok) {
        throw new Error("Failed to fetch worker data");
      }
      const data = await response.json();

      // Sort the data by department, shift, and gender
      const sortedData = data.sort((a, b) => {
        if (a.department !== b.department) {
          return a.department.localeCompare(b.department);
        }
        if (a.shift !== b.shift) {
          return a.shift.localeCompare(b.shift);
        }
        return a.gender.localeCompare(b.gender);
      });

      setWorkers(sortedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit action
  const handleEdit = (workerId) => {
    const worker = workers.find((w) => w._id === workerId);
    setSelectedWorker(worker);
    setIsEditModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${url}worker/${selectedWorker._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            department: selectedWorker.department,
            shift: selectedWorker.shift,
            location: selectedWorker.location // Add location to the update payload
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update worker data");
      }

      // Refresh the worker data
      await fetchWorkers();
      setIsEditModalOpen(false); // Close the modal
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle remove action
  const handleRemove = async (workerId) => {
    try {
      const response = await fetch(`${url}worker/${workerId}`, {
        method: "DELETE",
      });
  
      if (!response.ok) {
        throw new Error("Failed to delete worker");
      }
  
      // Display success alert
      alert("Worker deleted successfully!");
  
      // Refresh the worker data
      await fetchWorkers();
    } catch (err) {
      // Display error alert
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-red-500/50">
        <p className="text-center text-red-400 text-lg">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 mx-auto block bg-purple-700 hover:bg-purple-600 text-white py-2 px-4 rounded-md transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-red-500/50">
      <h1 className="text-2xl font-bold mb-6 text-white">All Workers</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-800">
            <th className="p-3 border border-gray-700 text-white">ID</th>
            <th className="p-3 border border-gray-700 text-white">First Name</th>
            <th className="p-3 border border-gray-700 text-white">Last Name</th>
            <th className="p-3 border border-gray-700 text-white">Email</th>
            <th className="p-3 border border-gray-700 text-white">Phone</th>
            <th className="p-3 border border-gray-700 text-white">Department</th>
            <th className="p-3 border border-gray-700 text-white">Location</th>
            <th className="p-3 border border-gray-700 text-white">Start Date</th>
            <th className="p-3 border border-gray-700 text-white">Shift</th>
            <th className="p-3 border border-gray-700 text-white">Gender</th>
            <th className="p-3 border border-gray-700 text-white">Age</th>
            <th className="p-3 border border-gray-700 text-white">Emergency Responder</th>
            <th className="p-3 border border-gray-700 text-white">Additional Details</th>
            <th className="p-3 border border-gray-700 text-white">Edit</th>
            <th className="p-3 border border-gray-700 text-white">Remove</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((worker) => (
            <tr key={worker._id} className="bg-gray-700 hover:bg-gray-600">
              <td className="p-3 border border-gray-600 text-white">{worker._id}</td>
              <td className="p-3 border border-gray-600 text-white">{worker.firstName}</td>
              <td className="p-3 border border-gray-600 text-white">{worker.lastName}</td>
              <td className="p-3 border border-gray-600 text-white">{worker.email}</td>
              <td className="p-3 border border-gray-600 text-white">{worker.phone}</td>
              <td className="p-3 border border-gray-600 text-white">{worker.department}</td>
              <td className="p-3 border border-gray-600 text-white">{worker.location || "Not specified"}</td>
              <td className="p-3 border border-gray-600 text-white">{worker.startDate}</td>
              <td className="p-3 border border-gray-600 text-white">{worker.shift}</td>
              <td className="p-3 border border-gray-600 text-white">{worker.gender}</td>
              <td className="p-3 border border-gray-600 text-white">{worker.age}</td>
              <td className="p-3 border border-gray-600 text-white">
                {worker.emergencyResponder ? "Yes" : "No"}
              </td>
              <td className="p-3 border border-gray-600 text-white">{worker.additionalDetails}</td>
              <td className="p-3 border border-gray-600 text-center">
                <button
                  onClick={() => handleEdit(worker._id)} 
                  className="text-teal-400 hover:text-teal-300 cursor-pointer"
                >
                  <Edit size={18} />
                </button>
              </td>
              <td className="p-3 border border-gray-600 text-center">
                <button
                  onClick={() => handleRemove(worker._id)} 
                  className="text-red-400 hover:text-red-300 cursor-pointer"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit Modal */}
      {isEditModalOpen && selectedWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-white text-center">Edit Worker</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Disabled Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-300">First Name</label>
                  <input
                    type="text"
                    value={selectedWorker.firstName}
                    disabled
                    className="w-full bg-gray-700 text-red-400 rounded-md p-2 mt-1 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Last Name</label>
                  <input
                    type="text"
                    value={selectedWorker.lastName}
                    disabled
                    className="w-full bg-gray-700 text-red-400 rounded-md p-2 mt-1 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Email</label>
                  <input
                    type="email"
                    value={selectedWorker.email}
                    disabled
                    className="w-full bg-gray-700 text-red-400 rounded-md p-2 mt-1 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Phone</label>
                  <input
                    type="text"
                    value={selectedWorker.phone}
                    disabled
                    className="w-full bg-gray-700 text-red-400 rounded-md p-2 mt-1 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Start Date</label>
                  <input
                    type="text"
                    value={selectedWorker.startDate}
                    disabled
                    className="w-full bg-gray-700 text-red-400 rounded-md p-2 mt-1 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Gender</label>
                  <input
                    type="text"
                    value={selectedWorker.gender}
                    disabled
                    className="w-full bg-gray-700 text-red-400 rounded-md p-2 mt-1 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Age</label>
                  <input
                    type="text"
                    value={selectedWorker.age}
                    disabled
                    className="w-full bg-gray-700 text-red-400 rounded-md p-2 mt-1 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Emergency Responder</label>
                  <input
                    type="text"
                    value={selectedWorker.emergencyResponder ? "Yes" : "No"}
                    disabled
                    className="w-full bg-gray-700 text-red-400 rounded-md p-2 mt-1 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Additional Details</label>
                  <input
                    type="text"
                    value={selectedWorker.additionalDetails}
                    disabled
                    className="w-full bg-gray-700 text-red-400 rounded-md p-2 mt-1 cursor-not-allowed"
                  />
                </div>

                {/* Editable Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-300">Department</label>
                  <select
                    value={selectedWorker.department}
                    onChange={(e) =>
                      setSelectedWorker({ ...selectedWorker, department: e.target.value })
                    }
                    className="w-full bg-gray-700 text-gray-300 rounded-md p-2 mt-1"
                  >
                    <option value="select department">Select Department</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="water">Water</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
  <label className="block text-sm font-medium text-gray-300">Location</label>
  <input
    type="text"
    value={selectedWorker.location || ""}
    onChange={(e) =>
      setSelectedWorker({ ...selectedWorker, location: e.target.value })
    }
    placeholder="Enter location"
    className="w-full bg-gray-700 text-gray-300 rounded-md p-2 mt-1"
  />
</div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Shift</label>
                  <select
                    value={selectedWorker.shift}
                    onChange={(e) =>
                      setSelectedWorker({ ...selectedWorker, shift: e.target.value })
                    }
                    className="w-full bg-gray-700 text-gray-300 rounded-md p-2 mt-1"
                  >
                    <option value="Select Shift">Select Preferred Shift</option>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-700 hover:bg-purple-600 text-white py-2 px-4 rounded-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayAllWorkers;