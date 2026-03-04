import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Filter, Search, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES, INDUSTRY_VERTICALS } from "@/utils/constants";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    location: "",
    industry: "",
  });
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    location: "",
    city: "",
    industry_vertical: "",
    sub_industry_vertical: "",
  });
  const [editCustomer, setEditCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [customers, filters]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      toast.error("Failed to fetch customers");
    }
  };

  const applyFilters = () => {
    let result = [...customers];
    
    if (filters.name) {
      result = result.filter(c => 
        c.name?.toLowerCase().includes(filters.name.toLowerCase())
      );
    }
    
    if (filters.location) {
      result = result.filter(c => c.location === filters.location);
    }
    
    if (filters.industry) {
      result = result.filter(c => c.industry_vertical === filters.industry);
    }
    
    setFilteredCustomers(result);
  };

  const clearFilters = () => {
    setFilters({ name: "", location: "", industry: "" });
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.location) {
      toast.error("Please fill required fields (Name, Location)");
      return;
    }

    const selectedCountry = COUNTRIES.find(c => c.code === newCustomer.location);

    try {
      await axios.post(`${API}/customers`, {
        ...newCustomer,
        location_name: selectedCountry?.name || "",
      });
      toast.success("Customer added successfully");
      setNewCustomer({
        name: "",
        location: "",
        city: "",
        industry_vertical: "",
        sub_industry_vertical: "",
      });
      setDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      toast.error("Failed to add customer");
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await axios.delete(`${API}/customers/${id}`);
      toast.success("Customer deleted successfully");
      fetchCustomers();
    } catch (error) {
      toast.error("Failed to delete customer");
    }
  };

  const handleEditCustomer = (customer) => {
    setEditCustomer({ ...customer });
    setEditDialogOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editCustomer?.name || !editCustomer?.location) {
      toast.error("Please fill required fields (Name, Location)");
      return;
    }
    const selectedCountry = COUNTRIES.find(c => c.code === editCustomer.location);
    try {
      await axios.put(`${API}/customers/${editCustomer.id}`, {
        name: editCustomer.name,
        location: editCustomer.location,
        location_name: selectedCountry?.name || "",
        city: editCustomer.city || "",
        industry_vertical: editCustomer.industry_vertical || "",
        sub_industry_vertical: editCustomer.sub_industry_vertical || "",
      });
      toast.success("Customer updated successfully");
      setEditDialogOpen(false);
      setEditCustomer(null);
      fetchCustomers();
    } catch (error) {
      toast.error("Failed to update customer");
    }
  };

  return (
    <div data-testid="customers">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">Customers</h1>
          <p className="text-base text-gray-600 mt-2">Manage customer master data</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="toggle-filters"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white" data-testid="add-customer-button">
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#0F172A]">Add New Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer-name">Customer Name *</Label>
                    <Input
                      id="customer-name"
                      placeholder="e.g., Acme Corporation"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      data-testid="customer-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-location">Location (Country) *</Label>
                    <Select value={newCustomer.location} onValueChange={(value) => setNewCustomer({ ...newCustomer, location: value })}>
                      <SelectTrigger id="customer-location" data-testid="customer-location-select">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="customer-city">City</Label>
                    <Input
                      id="customer-city"
                      placeholder="e.g., Dubai"
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                      data-testid="customer-city-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry-vertical">Industry Vertical</Label>
                    <Select value={newCustomer.industry_vertical} onValueChange={(value) => setNewCustomer({ ...newCustomer, industry_vertical: value })}>
                      <SelectTrigger id="industry-vertical" data-testid="industry-vertical-select">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_VERTICALS.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="sub-industry">Sub Industry Vertical</Label>
                    <Input
                      id="sub-industry"
                      placeholder="e.g., Investment Banking, Retail Banking"
                      value={newCustomer.sub_industry_vertical}
                      onChange={(e) => setNewCustomer({ ...newCustomer, sub_industry_vertical: e.target.value })}
                      data-testid="sub-industry-input"
                    />
                  </div>
                </div>
                <Button onClick={handleAddCustomer} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="submit-customer-button">
                  Add Customer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6 border border-[#E2E8F0]">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Customer Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name..."
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                    className="pl-9"
                    data-testid="filter-name"
                  />
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Select 
                  value={filters.location || "all"} 
                  onValueChange={(v) => setFilters({ ...filters, location: v === "all" ? "" : v })}
                >
                  <SelectTrigger data-testid="filter-location">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Industry</Label>
                <Select 
                  value={filters.industry || "all"} 
                  onValueChange={(v) => setFilters({ ...filters, industry: v === "all" ? "" : v })}
                >
                  <SelectTrigger data-testid="filter-industry">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {INDUSTRY_VERTICALS.map(i => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full" data-testid="clear-filters">
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-[#E2E8F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[#0F172A]">
            Customers List
            {filteredCustomers.length !== customers.length && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredCustomers.length} of {customers.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {customers.length === 0 
                  ? 'No customers added yet. Click "Add Customer" to get started.'
                  : "No customers match your filter criteria."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Industry Vertical</TableHead>
                    <TableHead>Sub Industry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} data-testid={`customer-row-${customer.id}`}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.location_name || COUNTRIES.find(c => c.code === customer.location)?.name || customer.location}</TableCell>
                      <TableCell>{customer.city || "—"}</TableCell>
                      <TableCell>{customer.industry_vertical || "—"}</TableCell>
                      <TableCell>{customer.sub_industry_vertical || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCustomer(customer)}
                            className="text-[#0EA5E9] hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
                            data-testid={`edit-customer-${customer.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                            data-testid={`delete-customer-${customer.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0F172A]">Edit Customer</DialogTitle>
          </DialogHeader>
          {editCustomer && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-customer-name">Customer Name *</Label>
                  <Input
                    id="edit-customer-name"
                    value={editCustomer.name}
                    onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })}
                    data-testid="edit-customer-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-customer-location">Location (Country) *</Label>
                  <Select value={editCustomer.location} onValueChange={(value) => setEditCustomer({ ...editCustomer, location: value })}>
                    <SelectTrigger id="edit-customer-location" data-testid="edit-customer-location-select">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-customer-city">City</Label>
                  <Input
                    id="edit-customer-city"
                    value={editCustomer.city || ""}
                    onChange={(e) => setEditCustomer({ ...editCustomer, city: e.target.value })}
                    data-testid="edit-customer-city-input"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-industry-vertical">Industry Vertical</Label>
                  <Select value={editCustomer.industry_vertical || "none"} onValueChange={(value) => setEditCustomer({ ...editCustomer, industry_vertical: value === "none" ? "" : value })}>
                    <SelectTrigger id="edit-industry-vertical" data-testid="edit-industry-vertical-select">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {INDUSTRY_VERTICALS.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-sub-industry">Sub Industry Vertical</Label>
                  <Input
                    id="edit-sub-industry"
                    value={editCustomer.sub_industry_vertical || ""}
                    onChange={(e) => setEditCustomer({ ...editCustomer, sub_industry_vertical: e.target.value })}
                    data-testid="edit-sub-industry-input"
                  />
                </div>
              </div>
              <Button onClick={handleUpdateCustomer} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="update-customer-button">
                Update Customer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
