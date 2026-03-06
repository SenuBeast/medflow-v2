import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NoAccessPage() {
    const navigate = useNavigate();
    return (
        <div className="min-h-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-6">
                <ShieldOff size={28} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-500 max-w-sm mb-8 text-sm leading-relaxed">
                You do not have permission to access this page. Contact your administrator to
                request access.
            </p>
            <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                icon={<ArrowLeft size={16} />}
            >
                Go Back
            </Button>
        </div>
    );
}
