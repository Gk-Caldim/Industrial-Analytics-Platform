import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { X, Download, Edit } from 'lucide-react';

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
  getTrackerForPhase,
  budgetTableData,
  submoduleData,
  selectedBudgetProject,
  masterProjects,
  budgetCurrency,
  chartImages
}) => {
  const reportRef = useRef();

  if (!show) return null;

  const downloadPdf = async () => {
    const element = reportRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    // Convert 1mm → pixels at scale 2 (96dpi → 3.7795 px/mm * 2)
    const pxPerMm = (canvas.width / pdfWidth);
    const pageHeightPx = pdfHeight * pxPerMm;

    const totalHeightPx = canvas.height;
    let pageTop = 0;
    let pageIndex = 0;

    while (pageTop < totalHeightPx) {
      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      const sliceHeight = Math.min(pageHeightPx, totalHeightPx - pageTop);
      pageCanvas.width = canvas.width;
      pageCanvas.height = pageHeightPx; // always full page height (blank remainder)

      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, pageTop, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      const imgData = pageCanvas.toDataURL('image/png');

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      pageTop += pageHeightPx;
      pageIndex++;
    }

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

  // Gather all visible phases/trackers that have data
  const visiblePhaseList = [
    { id: 'design', label: 'Design' },
    { id: 'partDevelopment', label: 'Part Development' },
    { id: 'build', label: 'Build' },
    { id: 'gateway', label: 'Gateway' },
    { id: 'validation', label: 'Validation' },
    { id: 'qualityIssues', label: 'Quality Issues' },
    ...(activeProject?.submodules || []).map(sub => ({ id: sub.id, label: sub.displayName || sub.name, isDynamic: true }))
  ].filter((phase, index, self) => {
    const isDuplicate = self.findIndex(p => p.id === phase.id) !== index;
    if (isDuplicate) return false;
    return visibleSections[phase.id] && availablePhases[phase.id];
  });

  const budgetStatus = masterProjects?.find(p => p.name === selectedBudgetProject)?.status || activeProject?.status || 'Active';

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
            minHeight: '297mm',
            padding: '30px',
            margin: '0 auto',
            boxShadow: '0 0 10px rgba(0,0,0,0.05)',
            fontFamily: 'Inter, sans-serif'
          }}>
            {/* Project Title */}
            <div style={{
              textAlign: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '3px solid #1e3a5f'
            }}>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '900',
                color: '#1e3a5f',
                margin: '0 0 4px 0',
                letterSpacing: '-0.02em'
              }}>
                {activeProject?.name || 'Project Dashboard'}
              </h1>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                Industrial Analytics Platform — Dashboard Report
              </div>
            </div>

            {/* Header */}
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
                  }}>{sopData?.[0]?.daysToGo || '—'} days to go</span>
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
                  }}>{sopData?.[0]?.status || '—'}</span>
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
            {visibleSections?.milestones && milestones?.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ 
                  backgroundColor: '#1e3a5f', 
                  color: 'white', 
                  padding: '10px 15px', 
                  fontWeight: 'bold', 
                  fontSize: '15px'
                }}>
                  <span>Milestones</span>
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
            )}

            {/* Critical Issues Section */}
            {visibleSections?.criticalIssues && criticalIssues?.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ 
                  backgroundColor: '#1e3a5f', 
                  color: 'white', 
                  padding: '10px 15px', 
                  fontWeight: 'bold', 
                  fontSize: '15px'
                }}>
                  <span>Critical Issues Summary</span>
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
            )}

            {/* Budget Summary - Real Table from API */}
            {visibleSections?.budget && (
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
                  <span>Budget Summary{selectedBudgetProject ? ` — ${selectedBudgetProject}` : ''}</span>
                  <span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.85 }}>
                    Status: {budgetStatus}
                  </span>
                </div>
                {budgetTableData && budgetTableData.length > 1 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        {budgetTableData[0].map((h, i) => (
                          <th key={i} style={{ padding: '10px 12px', textAlign: 'left', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {budgetTableData.slice(1).map((row, idx) => {
                        const isTotal = row[0] && row[0].toString().startsWith('Total');
                        const isCategory = row[0] && (row[0] === 'CAPEX' || row[0] === 'Revenue');
                        const fw = isTotal || isCategory ? 'bold' : 'normal';
                        const color = isTotal ? '#1e3a5f' : '#475569';
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isTotal ? '#f0f7ff' : 'white' }}>
                            {row.map((cell, colIdx) => (
                              <td key={colIdx} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', fontWeight: fw, color: color }}>
                                {budgetCurrency && colIdx > 1 && cell !== '' && cell !== null && !isNaN(Number(cell)) 
                                  ? `${budgetCurrency}${Number(cell).toLocaleString()}` 
                                  : cell}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                    No budget data available
                  </div>
                )}
              </div>
            )}

            {/* Resource Summary */}
            {visibleSections?.resource && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ 
                  backgroundColor: '#1e3a5f', 
                  color: 'white', 
                  padding: '10px 15px', 
                  fontWeight: 'bold', 
                  fontSize: '15px'
                }}>
                  Resource Summary
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 15px', color: '#64748b', width: '50%', border: '1px solid #e2e8f0' }}>Deployed</td>
                      <td style={{ padding: '10px 15px', fontWeight: 'bold', color: '#1e3a5f', border: '1px solid #e2e8f0' }}>{summaryData?.resourceDeployed}</td>
                      <td style={{ padding: '10px 15px', color: '#64748b', width: '50%', border: '1px solid #e2e8f0' }}>Shortage</td>
                      <td style={{ padding: '10px 15px', fontWeight: 'bold', color: '#ef4444', border: '1px solid #e2e8f0' }}>{summaryData?.resourceShortage}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 15px', color: '#64748b', border: '1px solid #e2e8f0' }}>Utilized</td>
                      <td style={{ padding: '10px 15px', fontWeight: 'bold', color: '#1e3a5f', border: '1px solid #e2e8f0' }}>{summaryData?.resourceUtilized}</td>
                      <td style={{ padding: '10px 15px', color: '#64748b', border: '1px solid #e2e8f0' }}>Under Utilized</td>
                      <td style={{ padding: '10px 15px', fontWeight: 'bold', color: '#f59e0b', border: '1px solid #e2e8f0' }}>{summaryData?.resourceUnderUtilized}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Quality Summary */}
            {visibleSections?.quality && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ 
                  backgroundColor: '#1e3a5f', 
                  color: 'white', 
                  padding: '10px 15px', 
                  fontWeight: 'bold', 
                  fontSize: '15px'
                }}>
                  Quality Summary
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 15px', color: '#64748b', width: '50%', border: '1px solid #e2e8f0' }}>Total Issues</td>
                      <td style={{ padding: '10px 15px', fontWeight: 'bold', color: '#1e3a5f', border: '1px solid #e2e8f0' }}>{summaryData?.qualityTotal}</td>
                      <td style={{ padding: '10px 15px', color: '#64748b', width: '50%', border: '1px solid #e2e8f0' }}>Action Completed</td>
                      <td style={{ padding: '10px 15px', fontWeight: 'bold', color: '#10b981', border: '1px solid #e2e8f0' }}>{summaryData?.qualityCompleted}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 15px', color: '#64748b', border: '1px solid #e2e8f0' }}>Open Issues</td>
                      <td style={{ padding: '10px 15px', fontWeight: 'bold', color: '#ef4444', border: '1px solid #e2e8f0' }}>{summaryData?.qualityOpen}</td>
                      <td style={{ padding: '10px 15px', color: '#64748b', border: '1px solid #e2e8f0' }}>No. of Critical Issues</td>
                      <td style={{ padding: '10px 15px', fontWeight: 'bold', color: '#ef4444', border: '1px solid #e2e8f0' }}>{summaryData?.qualityCritical}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Project Metrics — Chart Images from dashboard */}
            {visiblePhaseList.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a5f', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                  Project Metrics Summary
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {visiblePhaseList.map(phase => {
                    const imgSrc = chartImages?.[phase.id];
                    return (
                      <div key={phase.id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ 
                          backgroundColor: '#1e3a5f', 
                          color: 'white', 
                          padding: '8px 12px', 
                          fontSize: '13px', 
                          fontWeight: 'bold'
                        }}>
                          {phase.label}
                        </div>
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={phase.label}
                            style={{ width: '100%', height: 'auto', display: 'block', backgroundColor: '#fff' }}
                          />
                        ) : (
                          <div style={{ height: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                            <span style={{ fontSize: '22px', marginBottom: '8px' }}>📊</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '0 12px' }}>
                              No chart data — configure axes in the dashboard first
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
