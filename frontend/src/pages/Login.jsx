import { useState, useEffect } from 'react';
import { User, ChevronRight } from 'lucide-react';

export default function Login({ onLogin }) {
    const [reviewers, setReviewers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('http://localhost:3001/api/reviewers')
            .then(res => res.json())
            .then(data => {
                setReviewers(data);
                setLoading(false);
            })
            .catch(err => {
                setError('Could not connect to backend. Make sure the server is running.');
                setLoading(false);
            });
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '400px', margin: '10vh auto' }} className="animate-fade-in">
            <div className="card" style={{ textAlign: 'center' }}>
                <h2 style={{ marginBottom: '8px' }}>Select Reviewer</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                    Choose your identity to start reviewing syllabi.
                </p>

                {error && <div style={{ color: 'var(--accent-color)', marginBottom: '16px' }}>{error}</div>}

                <div className="flex flex-col gap-md">
                    {reviewers.map(reviewer => (
                        <button
                            key={reviewer.id}
                            className="card flex justify-between items-center"
                            style={{ cursor: 'pointer', textAlign: 'left', padding: '16px' }}
                            onClick={() => onLogin(reviewer)}
                        >
                            <div className="flex items-center gap-sm">
                                <User size={20} color="var(--primary-color)" />
                                <span style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff' }}>{reviewer.name}</span>
                            </div>
                            <ChevronRight size={16} color="var(--text-muted)" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
