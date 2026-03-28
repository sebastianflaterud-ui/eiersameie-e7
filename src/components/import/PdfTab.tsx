import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { extractPdfText, parseDnbPdf } from '@/lib/parsers/pdf-dnb';
import { ParsedTransaksjon } from '@/lib/klassifisering';
import { toast } from 'sonner';
import { Upload, FileText } from 'lucide-react';

interface Props {
  onParsed: (data: ParsedTransaksjon[]) => void;
}

export function PdfTab({ onParsed }: Props) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      toast.error('Kun .pdf-filer støttes');
      return;
    }

    setLoading(true);
    setFileName(file.name);

    try {
      const pages = await extractPdfText(file);
      const parsed = parseDnbPdf(pages);

      if (parsed.length === 0) {
        toast.error('Ingen transaksjoner funnet i PDF-en');
        return;
      }

      toast.success(`Parset ${parsed.length} transaksjoner fra ${file.name}`);
      onParsed(parsed);
    } catch (err) {
      console.error('PDF parse error:', err);
      toast.error('Kunne ikke lese PDF-filen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition"
          onDrop={e => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onDragOver={e => e.preventDefault()}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-12 w-12 text-primary animate-pulse" />
              <p className="text-muted-foreground">Leser {fileName}...</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Dra og slipp PDF-kontoutskrift her, eller klikk for å velge</p>
              <p className="text-xs text-muted-foreground mt-2">Støtter DNB kontoutskrifter</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
