import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BaseLocations = () => {
  const [locations, setLocations] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: "", overhead_percentage: "" });
  const [editLocation, setEditLocation] = useState(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API}/base-locations`);
      setLocations(response.data);
    } catch (error) {
      toast.error("Failed to fetch base locations");
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.name || !newLocation.overhead_percentage) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      await axios.post(`${API}/base-locations`, {
        name: newLocation.name,
        overhead_percentage: parseFloat(newLocation.overhead_percentage),
      });
      toast.success("Base location added successfully");
      setNewLocation({ name: "", overhead_percentage: "" });
      setDialogOpen(false);
      fetchLocations();
    } catch (error) {
      toast.error("Failed to add base location");
    }
  };

  const handleEditLocation = (location) => {
    setEditLocation({ id: location.id, name: location.name, overhead_percentage: String(location.overhead_percentage) });
    setEditDialogOpen(true);
  };

  const handleUpdateLocation = async () => {
    if (!editLocation?.overhead_percentage) {
      toast.error("Overhead percentage is required");
      return;
    }
    try {
      await axios.put(`${API}/base-locations/${editLocation.id}`, {
        overhead_percentage: parseFloat(editLocation.overhead_percentage),
      });
      toast.success("Overhead percentage updated");
      setEditDialogOpen(false);
      setEditLocation(null);
      fetchLocations();
    } catch (error) {
      toast.error("Failed to update base location");
    }
  };

  const handleDeleteLocation = async (id) => {
    try {
      await axios.delete(`${API}/base-locations/${id}`);
      toast.success("Base location deleted successfully");
      fetchLocations();
    } catch (error) {
      toast.error("Failed to delete base location");
    }
  };

  return (
    <div data-testid="base-locations">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">Base Locations</h1>
          <p className="text-base text-gray-600 mt-2">Manage locations with overhead percentages</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white" data-testid="add-location-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#0F172A]">Add Base Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="location-name">Location Name</Label>
                <Input
                  id="location-name"
                  placeholder="e.g., UAE, USA, India"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  data-testid="location-name-input"
                />
              </div>
              <div>
                <Label htmlFor="overhead-percentage">Overhead Percentage (%)</Label>
                <Input
                  id="overhead-percentage"
                  type="number"
                  placeholder="e.g., 30"
                  value={newLocation.overhead_percentage}
                  onChange={(e) => setNewLocation({ ...newLocation, overhead_percentage: e.target.value })}
                  data-testid="overhead-percentage-input"
                />
              </div>
              <Button onClick={handleAddLocation} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="submit-location-button">
                Add Location
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-[#E2E8F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[#0F172A]">Locations List</CardTitle>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No base locations added yet. Click "Add Location" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location Name</TableHead>
                  <TableHead className="text-right">Overhead Percentage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id} data-testid={`location-row-${location.id}`}>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{location.overhead_percentage}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLocation(location)}
                          className="text-[#0EA5E9] hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
                          data-testid={`edit-location-${location.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLocation(location.id)}
                          className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                          data-testid={`delete-location-${location.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Overhead Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0F172A]">Edit Overhead Percentage</DialogTitle>
          </DialogHeader>
          {editLocation && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Location</Label>
                <Input value={editLocation.name} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="edit-overhead">Overhead Percentage (%)</Label>
                <Input
                  id="edit-overhead"
                  type="number"
                  value={editLocation.overhead_percentage}
                  onChange={(e) => setEditLocation({ ...editLocation, overhead_percentage: e.target.value })}
                  data-testid="edit-overhead-input"
                />
              </div>
              <Button onClick={handleUpdateLocation} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="update-location-button">
                Update Overhead
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BaseLocations;
