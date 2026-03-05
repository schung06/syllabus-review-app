import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, Clock, BarChart, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || ''; // blank on vercel

export default function Dashboard({ reviewer }) {
    const [progress, setProgress] = groupProgressState();
    const [assignments, setAssignments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [reviewersList, setReviewersList] = useState([]);
    const [assigneeId, setAssigneeId] = useState('auto');
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [adminSyllabi, setAdminSyllabi] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (reviewer.role === 'admin') {
            fetch(`${API_BASE}/api/reviewers`)
                .then(res => res.json())
                .then(data => setReviewersList(data.filter(r => r.role === 'reviewer')))
                .catch(console.error);
        }
    }, [reviewer.role]);

    function groupProgressState() {
        return useState({ total: 0, completed: 0, reviewers: [] });
    }

    const fetchDashboardData = () => {
        fetch(`${API_BASE}/api/progress`)
            .then(res => res.json())
            .then(data => setProgress(data))
            .catch(console.error);

        if (reviewer.role === 'admin') {
            fetch(`${API_BASE}/api/admin/syllabi`)
                .then(res => res.json())
                .then(data => setAdminSyllabi(data))
                .catch(console.error);
        } else {
            fetch(`${API_BASE}/api/assignments/${reviewer.id}`)
                .then(res => res.json())
                .then(data => setAssignments(data))
                .catch(console.error);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        const intervalId = setInterval(fetchDashboardData, 10000); // Poll every 10 seconds
        return () => clearInterval(intervalId);
    }, [reviewer.id]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('syllabus', file);
        formData.append('reviewerId', assigneeId);

        setUploading(true);
        fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData,
        })
            .then(res => res.json())
            .then(data => {
                setUploading(false);
                fetchDashboardData(); // Refresh data
            })
            .catch(err => {
                console.error(err);
                setUploading(false);
            });
    };

    const handleLinkSubmit = () => {
        if (!linkUrl || !linkTitle) return;
        setUploading(true);
        fetch(`${API_BASE}/api/upload-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: linkTitle, link: linkUrl, reviewerId: assigneeId })
        })
            .then(res => res.json())
            .then(() => {
                setUploading(false);
                setLinkUrl('');
                setLinkTitle('');
                fetchDashboardData();
            })
            .catch(console.error);
    };

    const handleDeleteAssignment = (assignmentId) => {
        if (!window.confirm('Are you sure you want to delete this assignment?')) return;
        fetch(`${API_BASE}/api/assignments/${assignmentId}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(() => fetchDashboardData())
            .catch(console.error);
    };

    const handleDeleteSyllabus = (syllabusId) => {
        if (!window.confirm('Are you sure you want to delete this syllabus and ALL its assignments?')) return;
        fetch(`${API_BASE}/api/syllabi/${syllabusId}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(() => fetchDashboardData())
            .catch(console.error);
    };

    const handleUpdateAssignments = (syllabusId, reviewerIds) => {
        fetch(`${API_BASE}/api/admin/syllabi/${syllabusId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reviewerIds })
        })
            .then(res => res.json())
            .then(() => fetchDashboardData())
            .catch(console.error);
    };

    const myStats = progress.reviewers.find(r => r.id === reviewer.id) || { totalAssigned: 0, completedCount: 0 };
    const teamPending = progress.total - progress.completed;
    const myPending = myStats.totalAssigned - myStats.completedCount;

    return (
        <div className="animate-fade-in flex flex-col gap-lg">
            <div className="flex justify-between items-center bg-surface" style={{ marginBottom: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Welcome back, {reviewer.name.split(' ')[0]}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Here is the status of your syllabus reviews.</p>
                </div>
            </div>

            {reviewer.role === 'admin' && (
                <div className="card flex flex-col gap-md" style={{ marginBottom: '16px', background: 'var(--surface-color)' }}>
                    <h3 style={{ fontSize: '18px' }}>Admin Controls: Create Assignment</h3>
                    <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
                        <select
                            className="input-field"
                            style={{ margin: 0, padding: '10px', minWidth: '200px' }}
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            disabled={uploading}
                        >
                            <option value="auto">Auto-assign evenly</option>
                            <option value="all">Assign to All Reviewers</option>
                            {reviewersList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px', flexWrap: 'wrap' }}>
                            <input
                                type="file"
                                accept="application/pdf"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            <button
                                className="btn btn-outline"
                                onClick={handleUploadClick}
                                disabled={uploading}
                            >
                                <Upload size={16} /> Upload PDF
                            </button>
                            <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>OR</span>
                            <div className="flex gap-sm">
                                <input
                                    className="input-field"
                                    placeholder="Syllabus Title"
                                    value={linkTitle}
                                    onChange={e => setLinkTitle(e.target.value)}
                                    style={{ margin: 0, padding: '8px', width: '200px' }}
                                />
                                <input
                                    className="input-field"
                                    placeholder="Google Drive Link"
                                    value={linkUrl}
                                    onChange={e => setLinkUrl(e.target.value)}
                                    style={{ margin: 0, padding: '8px', width: '250px' }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={handleLinkSubmit}
                                    disabled={uploading || !linkUrl || !linkTitle}
                                    style={{ padding: '8px 16px' }}
                                >
                                    Submit Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {reviewer.role === 'admin' && (
                <div className="card flex justify-between items-center" style={{ marginBottom: '16px', background: 'var(--surface-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart size={20} color="var(--primary-color)" />
                        <h3 style={{ fontSize: '18px', margin: 0 }}>Export Data</h3>
                    </div>
                    <div>
                        <a
                            href={`${API_BASE}/api/admin/export`}
                            className="btn btn-primary"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <FileText size={16} /> Export to CSV
                        </a>
                    </div>
                </div>
            )}

            <div className="flex gap-lg" style={{ flexWrap: 'wrap' }}>
                {/* Team Progress Card */}
                <div className="card" style={{ flex: '1 1 300px' }}>
                    <div className="flex items-center gap-sm" style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                        <BarChart size={18} />
                        <h3 style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Group Progress</h3>
                    </div>
                    <div className="flex justify-between items-center">
                        <div>
                            <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--success-main)' }}>
                                {progress.completed} <span style={{ fontSize: '20px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {progress.total}</span>
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Total Reviewed</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '24px', fontWeight: 600 }}>{teamPending}</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Unreviewed</div>
                        </div>
                    </div>
                </div>

                {/* My Progress Card */}
                <div className="card" style={{ flex: '1 1 300px', borderTop: '4px solid var(--primary-color)' }}>
                    <div className="flex items-center gap-sm" style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                        <User size={18} />
                        <h3 style={{ fontSize: '16px', color: 'var(--text-muted)' }}>My Progress</h3>
                    </div>
                    <div className="flex justify-between items-center">
                        <div>
                            <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--primary-color)' }}>
                                {myStats.completedCount} <span style={{ fontSize: '20px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {myStats.totalAssigned}</span>
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>My Reviews</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '24px', fontWeight: 600, color: myPending > 0 ? 'var(--accent-color)' : 'var(--text-main)' }}>
                                {myPending}
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Pending</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '16px', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-hover)' }}>
                    <h3 style={{ fontSize: '18px' }}>{reviewer.role === 'admin' ? 'All Syllabi Management' : 'My Assigned Tasks'}</h3>
                </div>

                {reviewer.role === 'admin' ? (
                    adminSyllabi.length === 0 ? (
                        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p>No syllabi uploaded yet.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {adminSyllabi.map(syllabus => {
                                const assignedIds = syllabus.assignments.map(a => a.reviewerId.toString());

                                return (
                                    <div key={syllabus.id} className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div className="flex items-center gap-md">
                                            <div style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '8px' }}>
                                                <FileText size={24} color="var(--primary-color)" />
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '16px', marginBottom: '4px' }}>{syllabus.filename}</h4>
                                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    Uploaded: {new Date(syllabus.uploadedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-lg">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned To:</span>
                                                <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                                                    {reviewersList.map(r => {
                                                        const isSelected = assignedIds.includes(r.id.toString());
                                                        const assignment = syllabus.assignments.find(a => a.reviewerId === r.id);
                                                        const isCompleted = assignment && assignment.status === 'completed';

                                                        return (
                                                            <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: isCompleted ? 'not-allowed' : 'pointer', opacity: isCompleted ? 0.6 : 1 }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    disabled={isCompleted}
                                                                    title={isCompleted ? "Cannot unassign a completed review" : ""}
                                                                    onChange={(e) => {
                                                                        if (isCompleted) return;
                                                                        let newIds = [...assignedIds];
                                                                        if (e.target.checked) newIds.push(r.id.toString());
                                                                        else newIds = newIds.filter(id => id !== r.id.toString());
                                                                        handleUpdateAssignments(syllabus.id, newIds);
                                                                    }}
                                                                />
                                                                {r.name.split(' ')[0]}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <button
                                                className="btn btn-outline"
                                                style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)', padding: '6px 12px' }}
                                                onClick={() => handleDeleteSyllabus(syllabus.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )
                ) : (
                    assignments.length === 0 ? (
                        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p>You have no assigned syllabi to review at the moment.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {assignments.map(item => (
                                <div key={item.assignmentId} className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
                                    <div className="flex items-center gap-md">
                                        <div style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '8px' }}>
                                            <FileText size={24} color="var(--primary-color)" />
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '16px', marginBottom: '4px' }}>{item.filename}</h4>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                Uploaded: {new Date(item.uploadedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-lg">
                                        {item.status === 'completed' ? (
                                            <span className="badge badge-completed">
                                                <CheckCircle size={14} style={{ marginRight: '4px' }} /> Completed
                                            </span>
                                        ) : (
                                            <span className="badge badge-pending">
                                                <Clock size={14} style={{ marginRight: '4px' }} /> Pending
                                            </span>
                                        )}

                                        <Link
                                            to={`/review/${item.assignmentId}`}
                                            className={item.status === 'completed' ? 'btn btn-outline' : 'btn btn-primary'}
                                        >
                                            {item.status === 'completed' ? 'View Review' : 'Start Review'}
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
            </div>
        </div>
    );
}

