import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await signIn(email, password);
            navigate('/', { replace: true });
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to sign in');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen w-screen bg-pos-bg text-pos-text">
            <div className="w-full max-w-md p-8 bg-pos-surface border border-pos-border relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-pos-primary" />

                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-pos-primary text-pos-bg p-2 aspect-square flex items-center justify-center">
                            <Lock size={24} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-widest uppercase">MedFlow POS</h1>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-pos-accent/10 border-l-4 border-pos-accent text-pos-accent text-sm font-mono">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-pos-text-muted mb-2">Operator ID / Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-pos-bg border border-pos-border p-3 text-pos-text focus:outline-none focus:border-pos-primary transition-colors font-mono"
                            placeholder="staff@medflow.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-pos-text-muted mb-2">Access Code / Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-pos-bg border border-pos-border p-3 text-pos-text focus:outline-none focus:border-pos-primary transition-colors font-mono tracking-widest"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-4 bg-pos-primary hover:bg-pos-primary-hover text-pos-bg font-bold py-4 px-4 transition-colors uppercase tracking-widest disabled:opacity-50"
                    >
                        {isSubmitting ? 'Authenticating...' : 'Authorize Access'}
                    </button>
                </form>
            </div>
        </div>
    );
}
