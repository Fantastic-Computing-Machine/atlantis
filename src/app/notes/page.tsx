import { FileText, Plus } from 'lucide-react';

export const metadata = {
    title: 'atlantis // Notes',
};

export default function NotesPage() {
    return (
        <div className="h-full flex items-center justify-center bg-muted/20">
            <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Select a note</h2>
                    <p className="text-muted-foreground text-sm max-w-sm">
                        Choose a note from the sidebar or create a new one to get started.
                    </p>
                </div>
            </div>
        </div>
    );
}
