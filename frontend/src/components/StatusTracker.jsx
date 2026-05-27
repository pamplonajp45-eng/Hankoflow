export default function StatusTracker({ currentLevel, status, logs = [] }) {
  const sortedLogs = [...logs].sort((a, b) => Number(a.level) - Number(b.level));
  const steps = sortedLogs.length
    ? sortedLogs.map((log) => ({
        level: Number(log.level),
        label: `Approver ${log.level}`,
        action: log.action
      }))
    : [
        { level: 1, label: 'Approver 1', action: 'pending' }
      ];

  const rejectedLog = sortedLogs.find((log) => log.action === 'rejected');
  const completedCount = sortedLogs.filter((log) => log.action === 'approved').length;
  const progressWidth = status === 'approved'
    ? '100%'
    : status === 'rejected'
      ? `${Math.max(0, ((Number(rejectedLog?.level || currentLevel) - 1) / steps.length) * 100)}%`
      : `${Math.max(0, (completedCount / steps.length) * 100)}%`;

  return (
    <div style={{ margin: '1rem 0' }}>
      <div className="stepper-container">
        <div className="stepper-line">
          <div className="stepper-line-progress" style={{ width: progressWidth }} />
        </div>

        {steps.map((step) => {
          let stepClass = 'pending';
          let bubbleContent = step.level;

          if (step.action === 'approved' || status === 'approved') {
            stepClass = 'completed';
            bubbleContent = 'OK';
          } else if (step.action === 'rejected') {
            stepClass = 'rejected';
            bubbleContent = 'X';
          } else if (Number(currentLevel) === step.level || logs.length > 1) {
            stepClass = 'active';
          }

          return (
            <div key={step.level} className={`stepper-step ${stepClass}`}>
              <div className="step-bubble">{bubbleContent}</div>
              <div className="step-label">{step.label}</div>
            </div>
          );
        })}

        <div className={`stepper-step ${status === 'approved' ? 'completed' : status === 'rejected' ? 'rejected' : 'pending'}`}>
          <div className="step-bubble">
            {status === 'approved' ? 'OK' : status === 'rejected' ? 'X' : 'End'}
          </div>
          <div className="step-label">
            {status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Final'}
          </div>
        </div>
      </div>
    </div>
  );
}
