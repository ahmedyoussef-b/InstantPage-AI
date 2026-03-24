// src/app/documents/upload/page.tsx
'use client';

import { ArrowLeft, Upload as UploadIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DocumentUploader from '@/components/upload/DocumentUploader';

export default function UploadPage() {
    return (
        <div className="min-h-screen bg-[#212121]">
            {/* Header */}
            <div className="bg-[#171717] border-b border-white/5 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Link href="/">
                                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-lg font-semibold text-white">Upload de Documents</h1>
                                <p className="text-xs text-gray-500">Importez des documents dans la base de connaissances</p>
                            </div>
                        </div>
                        <Link href="/documents/manage">
                            <Button variant="ghost" className="text-gray-400 hover:text-white">
                                Gérer les documents
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <DocumentUploader />
            </div>
        </div>
    );
}