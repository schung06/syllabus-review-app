import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, FileText, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function Review({ reviewer }) {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Generic rubric state
    const [scores, setScores] = useState({
        bucketedGrading: '',
        multipleGradingSchemes: '',
        standardsBasedGrading: '',
        hwResubmission: '',
        highStakesResubmission: '',
        lowStakesResubmission: '',
        hwDroppingPolicy: '',
        highStakesDroppingPolicy: '',
        lowStakesDroppingPolicy: '',
        participationLectures: '',
        participationDiscussion: '',
        participationLabs: '',
        aiUseAllowed: '',
        weeklyReading: '',
        comments: ''
    });

    useEffect(() => {
        fetch(`${API_BASE}/api/assignments/${reviewer.id}`)
            .then(res => res.json())
            .then(data => {
                const item = data.find(a => a.assignmentId.toString() === assignmentId);
                if (item) {
                    setAssignment(item);
                    if (item.scores && item.status === 'completed') {
                        setScores(prev => ({ ...prev, ...JSON.parse(item.scores) }));
                    }
                }
                setLoading(false);
            })
            .catch(console.error);
    }, [assignmentId, reviewer.id]);

    if (loading) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    if (!assignment) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}>Assignment not found.</div>;

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        fetch(`${API_BASE}/api/reviews/${assignmentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scores)
        })
            .then(res => res.json())
            .then(() => {
                navigate('/');
            })
            .catch(err => {
                console.error(err);
                setSubmitting(false);
            });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setScores(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const isCompleted = assignment.status === 'completed';
    const formDisabled = isCompleted && !isEditing;

    const rubricCriteria = [
        {
            key: 'bucketedGrading',
            label: 'Bucketed/Minimum Grading',
            description: 'Bucketed/Minimum Grading is a grading system that groups student performance (letter grades) into achievement categories and assigns a fixed minimum score within each category in order to achieve a certain grade.',
            options: [
                { value: '0', text: '0 - There does not exist a minimum grading scheme' },
                { value: '1', text: '1 - There exists a minimum grading scheme' }
            ]
        },
        {
            key: 'multipleGradingSchemes',
            label: 'Multiple Grading Schemes',
            description: "Multiple Grading Schemes is a grading approach that allows students' work to be evaluated using different scoring methods or schemes so that the highest possible grade is applied. Non-multiple grading would mean the weight remains consistent throughout the entire quarter.",
            options: [
                { value: '0', text: '0 - No, does not use multiple grading schemes' },
                { value: '1', text: '1 - Yes, uses multiple grading schemes' }
            ]
        },
        {
            key: 'standardsBasedGrading',
            label: 'Standards Based Grading (Mastery Learning)',
            description: 'Mastery Learning is a grading approach that evaluates student performance by placing work into clearly defined mastery levels (unsatisfactory, satisfactory, and exemplary) based on demonstrated understanding of learning objectives, rather than a point system.',
            options: [
                { value: '0', text: '0 - No policy that support mastery learning' },
                { value: '1', text: '1 - Contains at least 1 policy that support mastery learning' }
            ]
        },
        {
            key: 'hwResubmission',
            label: 'HW Resubmission',
            description: 'Opportunity to resubmit homework/programming assignment after first submission either for partial or full credit.',
            options: [
                { value: '0', text: '0 - No resubmissions' },
                { value: '1', text: '1 - Partial resubmissions allowed or with limitations' },
                { value: '2', text: '2 - Resubmissions allowed for full credit' }
            ]
        },
        {
            key: 'highStakesResubmission',
            label: 'High-stakes Assessments Resubmission',
            description: 'Opportunity to retake or makeup Midterms, or Finals.',
            options: [
                { value: '0', text: '0 - No resubmissions' },
                { value: '1', text: '1 - Partial resubmissions allowed or with limitations' },
                { value: '2', text: '2 - Resubmissions allowed for full credit' }
            ]
        },
        {
            key: 'lowStakesResubmission',
            label: 'Low-stakes Assessments Resubmission',
            description: 'Opportunity to retake or makeup quizzes or tests either for partial or full credit.',
            options: [
                { value: '0', text: '0 - No resubmissions' },
                { value: '1', text: '1 - Partial resubmissions allowed or with limitations' },
                { value: '2', text: '2 - Resubmissions allowed for full credit' }
            ]
        },
        {
            key: 'hwDroppingPolicy',
            label: 'HW Dropping Policy',
            description: "Opportunity to completely drop lowest homework/programming assignment from student's grade, regardless of how other grade components will be redistributed as a result.",
            options: [
                { value: '0', text: '0 - No dropping policies' },
                { value: '1', text: '1 - Yes, has lowest hw dropping policies' }
            ]
        },
        {
            key: 'highStakesDroppingPolicy',
            label: 'High-stakes Assessments Dropping Policy',
            description: 'Opportunity to completely drop an entire lowest exam(midterm, test), regardless of how other grade components will be redistributed as a result.',
            options: [
                { value: '0', text: '0 - No dropping policies' },
                { value: '1', text: '1 - Yes, will drop the lowest Midterm/Test Score' }
            ]
        },
        {
            key: 'lowStakesDroppingPolicy',
            label: 'Low-stakes Assessments Dropping Policy',
            description: 'Opportunity to completely drop an entire lowest quiz, regardless of how other grade components will be redistributed as a result.',
            options: [
                { value: '0', text: '0 - No dropping policies' },
                { value: '1', text: '1 - Yes, has lowest quiz dropping policies' }
            ]
        },
        {
            key: 'participationLectures',
            label: 'Participation/Attendance in Lectures',
            description: 'A policy that evalutes student based on their presence and engagement during lecture sessions, which may include attending class, responding to in-class questions or polls, contributing to discussions, or completing lecture-based activities.',
            options: [
                { value: '0', text: '0 - It is not required/not part of the grading' },
                { value: '1', text: '1 - It is mandatory/part of the grading' }
            ]
        },
        {
            key: 'participationDiscussion',
            label: 'Participation/Attendance in Discussion',
            description: "Students' involvement in discussion sections through attendance, active contribution to problem-solving or group conversiations, and engagement with course material in a collaborative setting.",
            options: [
                { value: '0', text: '0 - It is not required/not part of the grading' },
                { value: '1', text: '1 - It is mandatory/part of the grading' }
            ]
        },
        {
            key: 'participationLabs',
            label: 'Participation in Labs',
            description: 'A policy that evaluates students based on attendance, completion of required lab activities, collaboration with parterners or teams, and demonstrated engagement with hands-on or technical excercises during lab sessions',
            options: [
                { value: '0', text: '0 - It is not required/not part of the grading' },
                { value: '1', text: '1 - It is mandatory/part of the grading' }
            ]
        },
        {
            key: 'aiUseAllowed',
            label: 'AI use allowed',
            description: 'The use of Generative AI (e.g., ChatGPT, Github Copilot) for assignments is explicitly allowed.',
            options: [
                { value: 'N', text: 'N - Not Allowed' },
                { value: 'NM', text: 'NM - Not mentioned' },
                { value: 'YR', text: 'YR - Allowed with restrictions' },
                { value: 'Y', text: 'Y - Allowed without restrictions' }
            ]
        },
        {
            key: 'weeklyReading',
            label: 'Weekly Reading',
            description: 'completion and engagement with assigned readings on a weeekly basis to ensure understanding of course material.',
            options: [
                { value: '0', text: '0 - It is not required/not part of the grading' },
                { value: '1', text: '1 - It is mandatory/part of the grading' }
            ]
        }
    ];

    return (
        <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100vh - 120px)', marginTop: '-8px' }}>
            {/* Review Header */}
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                <div className="flex items-center gap-md">
                    <Link to="/" className="btn btn-outline" style={{ padding: '8px' }}>
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={20} color="var(--primary-color)" />
                            Reviewing: {assignment.filename}
                        </h2>
                    </div>
                </div>
                <div>
                    {isCompleted && (
                        <span className="badge badge-completed flex items-center gap-sm">
                            <CheckCircle size={16} /> Completed
                        </span>
                    )}
                </div>
            </div>

            {/* Split Pane */}
            <div className="flex gap-lg" style={{ height: '100%' }}>

                {/* Left Side: PDF Viewer */}
                <div className="card" style={{ flex: '1', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-hover)' }}>
                        <h3 style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Syllabus Document</h3>
                    </div>
                    {(() => {
                        const fp = assignment.filepath;
                        let embedSrc;

                        if (!fp.startsWith('http')) {
                            // Local/API-served file
                            embedSrc = `${API_BASE}${fp}`;
                        } else if (fp.includes('res.cloudinary.com')) {
                            // Cloudinary — embeds directly
                            embedSrc = fp;
                        } else if (fp.includes('drive.google.com')) {
                            // Convert Google Drive share link to embed URL
                            const fileIdMatch = fp.match(/\/d\/([a-zA-Z0-9_-]+)/);
                            embedSrc = fileIdMatch
                                ? `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
                                : `https://docs.google.com/viewer?url=${encodeURIComponent(fp)}&embedded=true`;
                        } else {
                            // Any other URL — use Google Docs Viewer to embed
                            embedSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(fp)}&embedded=true`;
                        }

                        return (
                            <>
                                <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'flex-end' }}>
                                    <a href={fp} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                                        ↗ Open in new tab
                                    </a>
                                </div>
                                <iframe
                                    src={embedSrc}
                                    style={{ width: '100%', flex: 1, border: 'none', background: '#fff' }}
                                    title="Syllabus PDF"
                                    allow="fullscreen"
                                />
                            </>
                        );
                    })()}
                </div>

                {/* Right Side: Rubric */}
                <div className="card" style={{ width: '450px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                        Evaluation Rubric
                    </h3>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-lg" style={{ flex: 1 }}>

                        <div className="flex flex-col gap-md">
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Select the appropriate option for each policy based on the syllabus.</p>

                            {rubricCriteria.map(criterion => (
                                <div key={criterion.key} className="input-group" style={{ background: 'var(--surface-hover)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                                    <label className="input-label" style={{ marginBottom: '4px', fontSize: '16px', fontWeight: 'bold' }}>{criterion.label}</label>
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.4' }}>{criterion.description}</p>
                                    <div className="flex flex-col gap-sm">
                                        {criterion.options.map(option => (
                                            <label key={option.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: formDisabled ? 'default' : 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name={criterion.key}
                                                    value={option.value}
                                                    checked={scores[criterion.key] === option.value}
                                                    onChange={handleChange}
                                                    disabled={formDisabled}
                                                    style={{ marginTop: '4px' }}
                                                />
                                                <span style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.4' }}>{option.text}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="input-group">
                            <label className="input-label">Additional Comments</label>
                            <textarea
                                className="input-field"
                                name="comments"
                                value={scores.comments}
                                onChange={handleChange}
                                disabled={formDisabled}
                                rows={5}
                                placeholder="Any qualitative feedback..."
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '24px', display: 'flex', gap: '12px' }}>
                            {isCompleted && !isEditing ? (
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={{ width: '100%', padding: '12px' }}
                                    onClick={() => setIsEditing(true)}
                                >
                                    Edit Review
                                </button>
                            ) : (
                                <>
                                    {isEditing && (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            style={{ flex: 1, padding: '12px' }}
                                            onClick={() => {
                                                setIsEditing(false);
                                                if (assignment.scores) setScores(JSON.parse(assignment.scores));
                                            }}
                                            disabled={submitting}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ flex: 2, padding: '12px' }}
                                        disabled={formDisabled || submitting}
                                    >
                                        <Save size={18} />
                                        {submitting ? 'Submitting...' : isEditing ? 'Save Changes' : 'Submit Review'}
                                    </button>
                                </>
                            )}
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
