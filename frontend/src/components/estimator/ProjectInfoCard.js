import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { COUNTRIES } from "@/utils/constants";

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
}) => {
  return (
    <Card className={`border ${isReadOnly ? 'border-amber-300 bg-amber-50/30' : 'border-[#E2E8F0]'} shadow-sm`}>
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer select-none" onClick={() => toggleSection("projectInfo")}>
        <div className="flex items-center gap-2">
          {collapsedSections.projectInfo ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          <CardTitle className="text-xl font-bold text-[#0F172A]">Project Information</CardTitle>
        </div>
        {isReadOnly && (
          <Badge className="bg-amber-100 text-amber-800">
            {!isLatestVersion ? "Read-only: Older Version" :
             projectStatus === "in_review" ? "Read-only: In Review" :
             projectStatus === "superseded" ? "Read-only: Superseded" :
             projectStatus === "suspended" ? "Read-only: Suspended" :
             projectStatus === "obsolete" ? "Read-only: Obsolete" : "Read-only: Approved"}
          </Badge>
        )}
      </CardHeader>
      {!collapsedSections.projectInfo && (
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="customer">Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId} disabled={isReadOnly}>
              <SelectTrigger id="customer" data-testid="customer-select"><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="version-notes">Version Notes</Label>
            <Textarea id="version-notes" placeholder="Notes for this version (e.g., changes made, reason for update)" value={versionNotes} onChange={(e) => setVersionNotes(e.target.value)} data-testid="version-notes-input" rows={2} disabled={isReadOnly || !!projectId} />
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  );
};
