import { useState } from "react";
import { MessageSquareHeart, X, Send, Mic, MicOff, AlertTriangle, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { TRANSLATIONS } from "../lib/i18n";
import { createSpeechRecognition, SpeechRecognitionResultEvent } from "../lib/speech";

interface ChatMessage {
  sender: "user" | "assistant";
  text: string;
}

export function ElderCareAIAssistant() {
  const { language, setLanguage, profile } = useApp();
  const t = TRANSLATIONS[language];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "assistant",
      text:
        language === "kn"
          ? "ನಮಸ್ಕಾರ! ನಾನು ಎಲ್ಡರ್‌ಕೇರ್ AI ಸಹಾಯಕ. ವೆಬ್‌ಸೈಟ್ ಬಳಸುವುದು, ಸಹಾಯ ವಿನಂತಿ ಸಲ್ಲಿಸುವುದು ಅಥವಾ ಸ್ವಯಂಸೇವಕರನ್ನು ಹುಡುಕುವಲ್ಲಿ ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ."
          : "Hello! I am the ElderCare AI Assistant. I can help you navigate this website, prepare an assistance request, or answer questions in English or Kannada.",
    },
  ]);

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if (!content || loading) return;

    setError(null);
    const updatedMessages: ChatMessage[] = [...messages, { sender: "user", text: content }];
    setMessages(updatedMessages);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          language,
          role: profile?.role ?? "guest",
          history: updatedMessages.slice(-6),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to reach ElderCare AI Assistant.");
      }
      setMessages((prev) => [...prev, { sender: "assistant", text: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    const recognition = createSpeechRecognition();
    if (!recognition) {
      setError("Voice input is not supported in this browser. Please type your question.");
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    recognition.lang = language === "kn" ? "kn-IN" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    setError(null);

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setListening(false);
    };

    recognition.onerror = () => {
      setError("Could not capture voice clearly. Please try again or type.");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const quickPrompts =
    language === "kn"
      ? [
          "ಸಹಾಯ ವಿನಂತಿಯನ್ನು ಹೇಗೆ ಸಲ್ಲಿಸಬೇಕು?",
          "ಸ್ವಯಂಸೇವಕರು ಹೇಗೆ ಪರಿಶೀಲಿಸಲ್ಪಡುತ್ತಾರೆ?",
          "ನನ್ನ ವಿನಂತಿಯ ಸ್ಥಿತಿಯನ್ನು ಹೇಗೆ ನೋಡುವುದು?",
        ]
      : [
          "How do I submit an assistance request?",
          "How are volunteers verified for safety?",
          "How do I track my assigned volunteer?",
        ];

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-700 text-white font-semibold text-sm shadow-lg hover:bg-blue-800 transition-colors cursor-pointer"
          aria-label="Open ElderCare AI Assistant"
        >
          <MessageSquareHeart className="w-5 h-5" />
          <span>{t.aiAssistantTitle}</span>
        </button>
      )}

      {open && (
        <aside
          className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[420px] max-h-[82vh] bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden"
          aria-label="ElderCare AI Assistant"
        >
          <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-semibold">{t.aiAssistantTitle}</h3>
              <p className="text-xs text-slate-300">English & ಕನ್ನಡ Navigation Guide</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLanguage(language === "en" ? "kn" : "en")}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-md cursor-pointer"
              >
                {language === "en" ? "ಕನ್ನಡ" : "EN"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded-md cursor-pointer"
                aria-label="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-snug">
              Non-medical guidance only. For emergencies, call <strong>112 / 108 / 911</strong> immediately.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.sender === "user"
                      ? "bg-blue-700 text-white"
                      : "bg-white text-slate-800 border border-slate-200"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                <span>Thinking...</span>
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 flex flex-wrap gap-1.5">
            {quickPrompts.map((qp) => (
              <button
                key={qp}
                type="button"
                onClick={() => sendMessage(qp)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors cursor-pointer"
              >
                {qp}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2.5 rounded-lg border cursor-pointer shrink-0 ${
                listening
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
              aria-label="Speak your question"
              title="Voice Input"
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.aiAssistantPlaceholder}
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
