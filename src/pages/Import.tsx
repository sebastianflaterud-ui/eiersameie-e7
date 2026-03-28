import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LimInnTab } from '@/components/import/LimInnTab';
import { CsvTab } from '@/components/import/CsvTab';
import { PdfTab } from '@/components/import/PdfTab';
import { ManuellTab } from '@/components/import/ManuellTab';
import { ImportPreview } from '@/components/import/ImportPreview';
import { ParsedTransaksjon } from '@/lib/klassifisering';

export default function Import() {
  const [parsedData, setParsedData] = useState<ParsedTransaksjon[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleParsed = useCallback((data: ParsedTransaksjon[]) => {
    setParsedData(data);
    setShowPreview(data.length > 0);
  }, []);

  const handleImportDone = useCallback(() => {
    setParsedData([]);
    setShowPreview(false);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Import</h1>

      {!showPreview ? (
        <Tabs defaultValue="lim-inn">
          <TabsList>
            <TabsTrigger value="lim-inn">Lim inn</TabsTrigger>
            <TabsTrigger value="csv">CSV</TabsTrigger>
            <TabsTrigger value="pdf">PDF</TabsTrigger>
            <TabsTrigger value="manuell">Manuell</TabsTrigger>
          </TabsList>

          <TabsContent value="lim-inn">
            <LimInnTab onParsed={handleParsed} />
          </TabsContent>

          <TabsContent value="csv">
            <CsvTab onParsed={handleParsed} />
          </TabsContent>

          <TabsContent value="pdf">
            <PdfTab onParsed={handleParsed} />
          </TabsContent>

          <TabsContent value="manuell">
            <ManuellTab />
          </TabsContent>
        </Tabs>
      ) : (
        <ImportPreview
          data={parsedData}
          onBack={() => setShowPreview(false)}
          onImportDone={handleImportDone}
        />
      )}
    </div>
  );
}
