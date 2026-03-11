import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RotateCcw, ZoomIn } from 'lucide-react';
import getCroppedImg from '../../lib/cropImage';

interface AvatarCropperModalProps {
    imageSrc: string;
    onClose: () => void;
    onCropComplete: (croppedFile: File) => void;
}

export function AvatarCropperModal({ imageSrc, onClose, onCropComplete }: AvatarCropperModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setIsProcessing(true);
        try {
            const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            if (croppedFile) onCropComplete(croppedFile);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal title="Edit Profile Photo" size="md" onClose={onClose}>
            <div className="space-y-6">
                <div className="relative w-full h-[300px] bg-black/5 rounded-xl overflow-hidden shadow-inner">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        rotation={rotation}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onRotationChange={setRotation}
                        onZoomChange={setZoom}
                        onCropComplete={handleCropComplete}
                    />
                </div>

                <div className="space-y-4 px-2">
                    {/* Zoom Slider */}
                    <div className="flex items-center gap-4">
                        <ZoomIn size={18} className="text-text-dim shrink-0" />
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full accent-brand flex-1"
                        />
                    </div>
                    {/* Rotation Slider */}
                    <div className="flex items-center gap-4">
                        <RotateCcw size={18} className="text-text-dim shrink-0" />
                        <input
                            type="range"
                            value={rotation}
                            min={0}
                            max={360}
                            step={1}
                            aria-labelledby="Rotation"
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="w-full accent-brand flex-1"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border-dim">
                    <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave} loading={isProcessing}>
                        Save Photo
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
