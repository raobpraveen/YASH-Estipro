import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Upload, Trash2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const GanttCard = ({ projectId, ganttChart, ganttLoading, ganttInputRef, handleGanttUpload, handleGanttDelete, isReadOnly, collapsedSections, toggleSection }) => {
  if (!projectId) return null;

  return (
    <Card className="border border-[#E2E8F0] shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 cursor-pointer select-none" onClick={() => toggleSection("gantt")}>
        <div className="flex items-center gap-2">
          {collapsedSections.gantt ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          <CardTitle className="text-lg font-bold text-[#0F172A]">Timeline / Gantt Chart</CardTitle>
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {!isReadOnly && (
            <>
              <input type="file" ref={ganttInputRef} accept="image/*" onChange={handleGanttUpload} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => ganttInputRef.current?.click()} disabled={ganttLoading} data-testid="upload-gantt-btn">
                <Upload className="w-4 h-4 mr-1" /> {ganttLoading ? "Uploading..." : "Upload Image"}
              </Button>
              {ganttChart && (
                <Button variant="outline" size="sm" className="text-red-500 border-red-300" onClick={handleGanttDelete} data-testid="delete-gantt-btn">
                  <Trash2 className="w-4 h-4 mr-1" /> Remove
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>
      {!collapsedSections.gantt && (
      <CardContent>
        {ganttChart ? (
          <div className="relative">
            <img src={`${API}/projects/${projectId}/gantt?t=${ganttChart.uploaded_at}`} alt="Gantt Chart" className="w-full rounded-lg border border-gray-200 max-h-[500px] object-contain" data-testid="gantt-image" />
            <p className="text-xs text-gray-400 mt-2">{ganttChart.filename} — uploaded {new Date(ganttChart.uploaded_at).toLocaleDateString()}</p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No timeline image uploaded yet.</p>
            {!isReadOnly && <p className="text-xs mt-1">Upload a Gantt chart or project timeline image for quick reference.</p>}
          </div>
        )}
      </CardContent>
      )}
    </Card>
  );
};
