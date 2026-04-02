import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { X, Download, Edit, Maximize2 } from 'lucide-react';

const PdfPreviewModal = ({ 
  show, 
  onClose, 
  activeProject, 
  milestones, 
  criticalIssues, 
  sopData, 
  summaryData, 
  visibleSections,
  availablePhases,
  getTrackerForPhase
}) => {
  const reportRef = useRef();

  if (!show) return null;

  const downloadPdf = async () => {
    const element = reportRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${activeProject?.name || 'Project'}_Dashboard_Report.pdf`);
  };

  const getStatusPill = (status) => {
    const colors = {
      'Open': { bg: '#fee2e2', text: '#991b1b' },
      'Closed': { bg: '#d1fae5', text: '#065f46' },
      'In Progress': { bg: '#dbeafe', text: '#1e40af' },
      'On Track': { bg: '#d1fae5', text: '#065f46' },
      'At Risk': { bg: '#fed7aa', text: '#9a3412' },
      'Likely Delay': { bg: '#fff7ed', text: '#c2410c' },
    };
    const style = colors[status] || { bg: '#f3f4f6', text: '#1f2937' };
    return (
      <span style={{
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.text}33`
      }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '40px'
    }}>
      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        width: '1000px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Modal Controls */}
        <div style={{
          padding: '10px 20px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          zIndex: 10
        }}>
          <button
            onClick={downloadPdf}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1e3a5f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: '#f1f5f9',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* PDF Content Area */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
          <div ref={reportRef} style={{
            backgroundColor: 'white',
            width: '100%',
            minHeight: '297mm', // A4 Aspect Ratio
            padding: '30px',
            margin: '0 auto',
            boxShadow: '0 0 10px rgba(0,0,0,0.05)',
            fontFamily: 'Inter, sans-serif'
          }}>
            {/* Top Bar (Header) */}
            <div style={{
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '25px',
              paddingBottom: '15px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Report date: <span style={{ fontWeight: '600' }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a5f' }}>
                  SOP Date: <span style={{ 
                    backgroundColor: '#e0f2fe', 
                    padding: '4px 12px', 
                    borderRadius: '15px', 
                    marginLeft: '8px',
                    fontWeight: '800'
                  }}>{sopData?.[0]?.daysToGo || '20'} days to go</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a5f' }}>
                  Status: <span style={{ 
                    backgroundColor: '#fff7ed', 
                    color: '#c2410c',
                    padding: '4px 12px', 
                    borderRadius: '15px', 
                    marginLeft: '8px',
                    border: '1px solid #fed7aa',
                    fontWeight: '800'
                  }}>{sopData?.[0]?.status || 'Likely Delay'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a5f' }}>Overall Project Health:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>On Track</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>At Risk</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Critical</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones Section */}
            <div style={{ marginBottom: '25px' }}>
              <div style={{ 
                backgroundColor: '#1e3a5f', 
                color: 'white', 
                padding: '10px 15px', 
                fontWeight: 'bold', 
                fontSize: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Milestones</span>
                <Edit className="h-4 w-4" />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>Categories</th>
                    {['A', 'B', 'C', 'D', 'E', 'F'].map(cat => (
                      <th key={cat} style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>{cat}</th>
                    ))}
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>Implementation</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m, idx) => (
                    <React.Fragment key={idx}>
                      <tr>
                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', color: '#1e3a5f' }}>Plan</td>
                        {['a', 'b', 'c', 'd', 'e', 'f'].map(key => (
                          <td key={key} style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#445164' }}>{m.plan[key]}</td>
                        ))}
                        <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                          {getStatusPill(m.plan.implementation)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', color: '#059669' }}>Actual/Outlook</td>
                        {['a', 'b', 'c', 'd', 'e', 'f'].map(key => (
                          <td key={key} style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#445164' }}>{m.actual[key]}</td>
                        ))}
                        <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                          {getStatusPill(m.actual.implementation)}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Critical Issues Summary Section */}
            <div style={{ marginBottom: '25px' }}>
              <div style={{ 
                backgroundColor: '#1e3a5f', 
                color: 'white', 
                padding: '10px 15px', 
                fontWeight: 'bold', 
                fontSize: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Critical Issues Summary</span>
                <Edit className="h-4 w-4" />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>S.No</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>List of Top Critical Issues</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>Responsibility</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>Function</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>Target date for Closure</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalIssues.map((issue, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}>{idx + 1}</td>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#1e3a5f' }}>{issue.issue}</td>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#445164' }}>{issue.responsibility}</td>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#445164' }}>{issue.function}</td>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#445164' }}>{issue.targetDate}</td>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{getStatusPill(issue.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Project Metrics Summary Section */}
            <div style={{ marginBottom: '25px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a5f', marginBottom: '15px' }}>Project Metrics Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                {[
                  { id: 'design', label: 'Design' },
                  { id: 'partDevelopment', label: 'Part Development' },
                  { id: 'build', label: 'Build' },
                  { id: 'gateway', label: 'Gateway' },
                  { id: 'validation', label: 'Validation' },
                  { id: 'qualityIssues', label: 'Quality Issues' }
                ].map(phase => {
                    const isVisible = visibleSections[phase.id] && availablePhases[phase.id];
                    if (!isVisible) return null;
                    
                    return (
                      <div key={phase.id} style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          backgroundColor: '#1e3a5f', 
                          color: 'white', 
                          padding: '8px 12px', 
                          fontSize: '13px', 
                          fontWeight: 'bold',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>{phase.label}</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <div style={{ backgroundColor: '#2d4b7c', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>..</div>
                            <div style={{ backgroundColor: '#2d4b7c', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>Configure</div>
                            <div style={{ backgroundColor: '#2d4b7c', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>Max</div>
                          </div>
                        </div>
                        <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcfdff' }}>
                          <span style={{ fontSize: '24px', color: '#f1f5f9' }}>⚙️</span>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a5f', marginTop: '10px' }}>Configure Attributes</span>
                          <span style={{ fontSize: '9px', color: '#64748b', textAlign: 'center', padding: '0 20px', marginTop: '5px' }}>
                            Please select the X and Y axes in the settings to visualize this chart.
                          </span>
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>

            {/* Bottom Summary Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              {/* Budget Summary */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#1e3a5f', color: 'white', padding: '10px 15px', fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Budget Summary</span>
                  <Edit className="h-4 w-4" />
                </div>
                <div style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Approved:</span>
                    <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.budgetApproved}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Utilized:</span>
                    <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.budgetUtilized}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Balance:</span>
                    <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.budgetBalance}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Utilization Outlook:</span>
                    <span style={{ fontWeight: 'bold', color: '#10b981' }}>{summaryData.budgetOutlook}</span>
                  </div>
                </div>
              </div>

              {/* Resource Summary */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#1e3a5f', color: 'white', padding: '10px 15px', fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Resource Summary</span>
                  <Edit className="h-4 w-4" />
                </div>
                <div style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Deployed:</span>
                    <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.resourceDeployed}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Utilized:</span>
                    <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.resourceUtilized}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Shortage:</span>
                    <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{summaryData.resourceShortage}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Under Utilized:</span>
                    <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{summaryData.resourceUnderUtilized}</span>
                  </div>
                </div>
              </div>

              {/* Quality Summary */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#1e3a5f', color: 'white', padding: '10px 15px', fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Quality Summary</span>
                  <Edit className="h-4 w-4" />
                </div>
                <div style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Total Issues:</span>
                    <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.qualityTotal}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Action Completed:</span>
                    <span style={{ fontWeight: 'bold', color: '#10b981' }}>{summaryData.qualityCompleted}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Open Issues:</span>
                    <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{summaryData.qualityOpen}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>No of Critical Issues:</span>
                    <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{summaryData.qualityCritical}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
