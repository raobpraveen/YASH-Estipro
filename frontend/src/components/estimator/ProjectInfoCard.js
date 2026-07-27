import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, X, Search, ChevronsUpDown, Check } from "lucide-react";
import { COUNTRIES } from "@/utils/constants";

const BID_CATEGORIES = [
  { value: "", label: "None" },
  { value: "Pipeline", label: "Pipeline" },
  { value: "Budgetary", label: "Budgetary" },
  { value: "Most Likely", label: "Most Likely" },
  { value: "Committed", label: "Committed" },
];

export const ProjectInfoCard = ({
  isReadOnly, isLatestVersion, projectStatus,
  collapsedSections, toggleSection,
  customerId, setCustomerId, customers,
  projectName, setProjectName,
  projectLocations, setProjectLocations,
  technologyIds, setTechnologyIds, technologies,
  subTechnologyIds, setSubTechnologyIds, subTechnologies,
  projectTypeIds, setProjectTypeIds, projectTypes,
  salesManagerId, setSalesManagerId, salesManagers,
  profitMarginPercentage, setProfitMarginPercentage,
  negoBufferPercentage, setNegoBufferPercentage,
  crmId, setCrmId,
  visibility, setVisibility,
  restrictedUserIds, setRestrictedUserIds,
  restrictedUserNames, setRestrictedUserNames,
  allUsers, currentUser,
  projectDescription, setProjectDescription,
  versionNotes, setVersionNotes,
  projectId,
  bidCategory, setBidCategory,
  forecastedClosureDate, setForecastedClosureDate,
  billingEntityId, setBillingEntityId, billingEntities = [],
  competencyIds, setCompetencyIds, competencies,
  commercialStatus, setCommercialStatus,
  previousStatus,
}) => {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const term = customerSearch.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(term));
  }, [customers, customerSearch]);

  const selectedCustomerName = customers.find(c => c.id === customerId)?.name || "";

  return (
    <Card className={`border ${isReadOnly ? 'border-amber-300 bg-amber-50/30' : 'border-[#E2E8F0]'} shadow-sm`}>
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer select-none" onClick={() => toggleSection("projectInfo")}>
        <div className="flex items-center gap-2">
          {collapsedSections.projectInfo ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          <CardTitle className="text-xl font-bold text-[#0F172A]">Project Information</CardTitle>
        </div>
        {isReadOnly && (
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800">
              {!isLatestVersion ? "Read-only: Older Version" :
               projectStatus === "in_review" ? "Read-only: In Review" :
               projectStatus === "superseded" ? "Read-only: Superseded" :
               projectStatus === "suspended" ? `Read-only: Suspended${previousStatus ? ` (was ${previousStatus.charAt(0).toUpperCase() + previousStatus.slice(1)})` : ""}` :
               projectStatus === "obsolete" ? "Read-only: Obsolete" : "Read-only: Approved"}
            </Badge>
          </div>
        )}
      </CardHeader>
      {!collapsedSections.projectInfo && (
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Customer with search */}
          <div>
            <Label htmlFor="customer">Customer *</Label>
            {isReadOnly ? (
              <Input value={selectedCustomerName} disabled className="bg-gray-50" data-testid="customer-display" />
            ) : (
              <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal" data-testid="customer-select">
                    {selectedCustomerName || "Select customer..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="flex items-center gap-2 px-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="flex-1 text-sm outline-none bg-transparent"
                        data-testid="customer-search-input"
                      />
                    </div>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto p-1">
                    {filteredCustomers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No customers found</p>
                    ) : filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setCustomerId(c.id); setCustomerPopoverOpen(false); setCustomerSearch(""); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 flex items-center gap-2 ${customerId === c.id ? "bg-blue-50 text-blue-700" : ""}`}
                        data-testid={`customer-option-${c.id}`}
                      >
                        {customerId === c.id && <Check className="w-3 h-3" />}
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div>
            <Label htmlFor="project-name">Project Name *</Label>
            <Input id="project-name" placeholder="Enter project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} data-testid="project-name-input" disabled={isReadOnly} />
          </div>
          <div>
            <Label>Project Location(s)</Label>
            <div className="flex flex-wrap gap-1 min-h-[40px] p-2 border rounded-md bg-white">
              {projectLocations.map(code => {
                const country = COUNTRIES.find(c => c.code === code);
                return (
                  <Badge key={code} variant="secondary" className="flex items-center gap-1">
                    {country?.name || code}
                    {!isReadOnly && (
                      <button onClick={() => setProjectLocations(projectLocations.filter(c => c !== code))} className="ml-1 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                );
              })}
              {!isReadOnly && (
                <Select value="" onValueChange={(value) => { if (value && !projectLocations.includes(value)) setProjectLocations([...projectLocations, value]); }}>
                  <SelectTrigger className="w-[140px] h-7 text-xs border-dashed" data-testid="project-location-select"><SelectValue placeholder="+ Add location" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.filter(c => !projectLocations.includes(c.code)).map((country) => (
                      <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div>
            <Label>Technology(s) *</Label>
            <div className="flex flex-wrap gap-1 min-h-[40px] p-2 border rounded-md bg-white">
              {technologyIds.map(id => {
                const tech = technologies.find(t => t.id === id);
                return (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-700">
                    {tech?.name || id}
                    {!isReadOnly && (
                      <button onClick={() => setTechnologyIds(technologyIds.filter(t => t !== id))} className="ml-1 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                );
              })}
              {!isReadOnly && (
                <Select value="" onValueChange={(value) => { if (value && !technologyIds.includes(value)) setTechnologyIds([...technologyIds, value]); }}>
                  <SelectTrigger className="w-[120px] h-7 text-xs border-dashed" data-testid="technology-select"><SelectValue placeholder="+ Add tech" /></SelectTrigger>
                  <SelectContent>
                    {technologies.filter(t => !technologyIds.includes(t.id)).map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div>
            <Label>Sub Technology</Label>
            <div className="flex flex-wrap gap-1 min-h-[40px] p-2 border rounded-md bg-white">
              {subTechnologyIds.map(id => {
                const st = subTechnologies.find(t => t.id === id);
                return (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-indigo-100 text-indigo-700">
                    {st?.name || id}
                    {!isReadOnly && (
                      <button onClick={() => setSubTechnologyIds(subTechnologyIds.filter(t => t !== id))} className="ml-1 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                );
              })}
              {!isReadOnly && (
                <Select value="" onValueChange={(value) => { if (value && !subTechnologyIds.includes(value)) setSubTechnologyIds([...subTechnologyIds, value]); }}>
                  <SelectTrigger className="w-[130px] h-7 text-xs border-dashed" data-testid="sub-technology-select"><SelectValue placeholder="+ Add sub-tech" /></SelectTrigger>
                  <SelectContent>
                    {subTechnologies.filter(st => technologyIds.includes(st.technology_id) && !subTechnologyIds.includes(st.id)).map(st => (
                      <SelectItem key={st.id} value={st.id}>{st.name} ({st.technology_name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div>
            <Label>Project Type(s) *</Label>
            <div className="flex flex-wrap gap-1 min-h-[40px] p-2 border rounded-md bg-white">
              {projectTypeIds.map(id => {
                const type = projectTypes.find(t => t.id === id);
                return (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-teal-100 text-teal-700">
                    {type?.name || id}
                    {!isReadOnly && (
                      <button onClick={() => setProjectTypeIds(projectTypeIds.filter(t => t !== id))} className="ml-1 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                );
              })}
              {!isReadOnly && (
                <Select value="" onValueChange={(value) => { if (value && !projectTypeIds.includes(value)) setProjectTypeIds([...projectTypeIds, value]); }}>
                  <SelectTrigger className="w-[120px] h-7 text-xs border-dashed" data-testid="project-type-select"><SelectValue placeholder="+ Add type" /></SelectTrigger>
                  <SelectContent>
                    {projectTypes.filter(t => !projectTypeIds.includes(t.id)).map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div>
            <Label>Sales Manager</Label>
            <Select value={salesManagerId || "none"} onValueChange={(v) => setSalesManagerId(v === "none" ? "" : v)} disabled={isReadOnly}>
              <SelectTrigger data-testid="sales-manager-select"><SelectValue placeholder="Select sales manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {salesManagers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>{manager.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <Label>Profit Margin %</Label>
              <span className="font-mono font-semibold text-[#0F172A]" data-testid="profit-margin-display">{profitMarginPercentage}%</span>
            </div>
            <Slider value={[profitMarginPercentage]} onValueChange={([value]) => setProfitMarginPercentage(value)} disabled={isReadOnly} min={0} max={50} step={1} data-testid="profit-margin-slider" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <Label>Nego Buffer %</Label>
              <span className="font-mono font-semibold text-blue-600" data-testid="nego-buffer-display">{negoBufferPercentage}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" max="100" step="0.5" value={negoBufferPercentage} onChange={(e) => setNegoBufferPercentage(parseFloat(e.target.value) || 0)} className="w-24 text-right" disabled={isReadOnly} data-testid="nego-buffer-input" />
              <span className="text-sm text-gray-500">% of selling price</span>
            </div>
          </div>
          <div>
            <Label htmlFor="crm-id">CRM ID</Label>
            <Input id="crm-id" placeholder="CRM Identifier (max 30 chars)" value={crmId} onChange={(e) => setCrmId(e.target.value.slice(0, 30))} maxLength={30} data-testid="crm-id-input" disabled={isReadOnly} />
          </div>
          {/* Bid Category - always editable */}
          <div>
            <Label>Bid Category</Label>
            <Select value={bidCategory || ""} onValueChange={(v) => setBidCategory(v)}>
              <SelectTrigger data-testid="bid-category-select"><SelectValue placeholder="Select bid category" /></SelectTrigger>
              <SelectContent>
                {BID_CATEGORIES.map(bc => (
                  <SelectItem key={bc.value || "none"} value={bc.value || "none"}>{bc.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Billing Entity - mandatory (Iter 79) */}
          <div>
            <Label>Billing Entity <span className="text-red-500">*</span></Label>
            <Select value={billingEntityId || ""} onValueChange={(v) => setBillingEntityId(v)} disabled={isReadOnly}>
              <SelectTrigger data-testid="billing-entity-select" className={!billingEntityId ? "border-red-300" : ""}>
                <SelectValue placeholder="Select billing entity" />
              </SelectTrigger>
              <SelectContent>
                {billingEntities.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-gray-500">No entities — add one under Master Data &rarr; Billing Entities</div>
                ) : billingEntities.map(be => (
                  <SelectItem key={be.id} value={be.id}>{be.name}{be.code ? ` (${be.code})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Forecasted Closure Date - always editable (keeps moving) */}
          <div>
            <Label>Forecasted Closure Date</Label>
            <Input type="date" value={forecastedClosureDate} onChange={(e) => setForecastedClosureDate(e.target.value)} data-testid="forecasted-closure-date" />
          </div>
          {/* Commercial Status - always editable, visible after approval */}
          {(projectStatus === "approved" || projectStatus === "suspended" || projectStatus === "in_review" || commercialStatus) && (
            <div>
              <Label>Commercial Status</Label>
              <Select value={commercialStatus || "none"} onValueChange={(v) => setCommercialStatus(v === "none" ? "" : v)}>
                <SelectTrigger data-testid="commercial-status-select"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Not Set --</SelectItem>
                  <SelectItem value="Pending for Submission">Pending for Submission</SelectItem>
                  <SelectItem value="Submitted to Customer">Submitted to Customer</SelectItem>
                  <SelectItem value="Won">Won</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {/* Competency */}
          <div>
            <Label>Competency</Label>
            <div className="flex flex-wrap gap-1 min-h-[40px] p-2 border rounded-md bg-white">
              {(competencyIds || []).map(id => {
                const comp = (competencies || []).find(c => c.id === id);
                return (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-700">
                    {comp?.name || id}
                    {!isReadOnly && (
                      <button onClick={() => setCompetencyIds(competencyIds.filter(c => c !== id))} className="ml-1 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                );
              })}
              {!isReadOnly && (
                <Select value="" onValueChange={(value) => { if (value && !(competencyIds || []).includes(value)) setCompetencyIds([...(competencyIds || []), value]); }}>
                  <SelectTrigger className="w-[140px] h-7 text-xs border-dashed" data-testid="competency-select"><SelectValue placeholder="+ Add" /></SelectTrigger>
                  <SelectContent>
                    {(competencies || []).filter(c => !(competencyIds || []).includes(c.id)).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          {/* Access Control */}
          <div>
            <Label htmlFor="visibility">Access Level</Label>
            <Select value={visibility} onValueChange={(val) => { setVisibility(val); if (val === "public") { setRestrictedUserIds([]); setRestrictedUserNames([]); } }} disabled={isReadOnly}>
              <SelectTrigger id="visibility" data-testid="visibility-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public (All users)</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {visibility === "restricted" && (
            <div className="md:col-span-2">
              <Label>Restricted Users (can view & edit)</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] bg-white">
                {restrictedUserIds.map((userId, idx) => {
                  const user = allUsers.find(u => u.id === userId);
                  return (
                    <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                      {user?.name || restrictedUserNames[idx] || userId}
                      {!isReadOnly && (
                        <X className="w-3 h-3 cursor-pointer" onClick={() => {
                          setRestrictedUserIds(prev => prev.filter(id => id !== userId));
                          setRestrictedUserNames(prev => prev.filter((_, i) => i !== idx));
                        }} />
                      )}
                    </Badge>
                  );
                })}
                {!isReadOnly && (
                  <Select value="" onValueChange={(userId) => {
                    if (userId && !restrictedUserIds.includes(userId)) {
                      const user = allUsers.find(u => u.id === userId);
                      if (user) {
                        setRestrictedUserIds(prev => [...prev, userId]);
                        setRestrictedUserNames(prev => [...prev, user.name]);
                      }
                    }
                  }}>
                    <SelectTrigger className="w-[180px] h-8 text-xs" data-testid="add-restricted-user"><SelectValue placeholder="+ Add user..." /></SelectTrigger>
                    <SelectContent>
                      {allUsers.filter(u => u.id !== currentUser.id && !restrictedUserIds.includes(u.id)).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">You (creator) and the approver always have access</p>
            </div>
          )}
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="project-description">Description</Label>
            <Textarea id="project-description" placeholder="Project description" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} data-testid="project-description-input" rows={2} disabled={isReadOnly} />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="version-notes">Version Notes <span className="text-red-500">*</span></Label>
            <Textarea id="version-notes" placeholder="Notes for this version (mandatory: describe changes made, reason for update)" value={versionNotes} onChange={(e) => setVersionNotes(e.target.value)} data-testid="version-notes-input" rows={2} disabled={isReadOnly} required />
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  );
};
