import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { Send, RotateCcw } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'Oppsummer leieinntekter 2025',
  'Vis utgifter Eiersameie E7 siste 6 måneder',
  'Skattemeldingsgrunnlag 2025',
  'Hvilke transaksjoner er ikke klassifisert?',
  'Sammenlign inntekter og utgifter per måned',
  'Hvem skylder leie?',
  'Hva er mine månedlige faste kostnader?',
];

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyse-chat', {
        body: { messages: [...messages, userMsg] },
      });

      if (error) throw error;

      const assistantContent = data?.content || data?.error || 'Ingen respons fra AI.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Feil: ${e.message || 'Kunne ikke kontakte AI'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">AI Chat</h1>
        <Button variant="outline" size="sm" onClick={() => setMessages([])}>
          <RotateCcw className="h-4 w-4 mr-1" />Ny samtale
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <p className="text-muted-foreground">Spør meg om dine transaksjoner, leieinntekter eller skattemeldingsgrunnlag.</p>
            <div className="flex flex-wrap gap-2 max-w-lg justify-center">
              {SUGGESTIONS.map(s => (
                <Button key={s} variant="outline" size="sm" className="text-xs" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <Card className={`max-w-[80%] p-4 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </Card>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <Card className="p-4 bg-muted">
              <p className="text-sm text-muted-foreground animate-pulse">Analyserer data...</p>
            </Card>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Skriv et spørsmål..."
          onKeyDown={e => e.key === 'Enter' && send(input)}
          disabled={loading}
        />
        <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
