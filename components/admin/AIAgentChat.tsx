'use client'
import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, Bot, User, Zap } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: AgentAction[]
  timestamp: Date
}

interface AgentAction {
  type: string
  label: string
  result?: string
  status: 'pending' | 'done' | 'error'
}

interface StoreContext {
  storeName: string; storeId: string
  todayOrders: number; todayRevenue: number
  activeProducts: number; pendingOrders: number
}

const QUICK_COMMANDS = [
  { label: '📊 ملخص اليوم',        prompt: 'أعطني ملخص مبيعات اليوم' },
  { label: '📦 الطلبات المعلقة',   prompt: 'كم طلب معلق عندي الآن وشو نعمل؟' },
  { label: '🎟️ إنشاء كوبون',      prompt: 'أنشئ كوبون خصم 20% لمدة 48 ساعة' },
  { label: '🚚 أفضل شركة توصيل',  prompt: 'أي شركة توصيل الأحسن لولاية الجزائر؟' },
  { label: '📈 تحليل المبيعات',   prompt: 'حلل مبيعاتي وأخبرني بأكثر منتج مبيعاً' },
  { label: '⚠️ تقرير الاحتيال',   prompt: 'أعطني تقرير عن الطلبات المشبوهة' },
]

export default function AIAgentChat({ storeContext }: { storeContext: StoreContext }) {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: `السلام عليكم! أنا مساعدك الذكي لإدارة متجر **${storeContext.storeName}** 🤖\n\nاليوم عندك:\n• **${storeContext.todayOrders}** طلب جديد\n• **${formatDZD(storeContext.todayRevenue)}** إيرادات\n• **${storeContext.pendingOrders}** طلب ينتظر التأكيد\n\nكيف نقدر نساعدك؟`,
    timestamp: new Date(),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          storeId: storeContext.storeId,
          context: storeContext,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.message ?? 'عذراً، حدث خطأ.',
        actions: data.actions,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'عذراً، حدث خطأ في الاتصال. تأكد من إعداد مفتاح Gemini API.',
        timestamp: new Date(),
      }])
    }
    setLoading(false)
  }

  const renderContent = (text: string) => {
    // Simple markdown: bold
    return text
      .split('\n')
      .map((line, i) => (
        <p key={i} className={line === '' ? 'h-2' : ''}>
          {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
            j % 2 === 1 ? <strong key={j} className="text-white font-bold">{part}</strong> : part
          )}
        </p>
      ))
  }

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-[#E8431A] rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white">مساعد AI — دكاني</h1>
          <p className="text-xs text-gray-500">مدعوم بـ Gemini 2.0 Flash</p>
        </div>
        <div className="mr-auto flex gap-2">
          {[
            { label: `${storeContext.todayOrders} طلب اليوم`, cls: 'bg-blue-500/20 text-blue-400' },
            { label: `${storeContext.pendingOrders} معلق`, cls: 'bg-yellow-500/20 text-yellow-400' },
          ].map(b => (
            <span key={b.label} className={`text-xs px-2.5 py-1 rounded-lg ${b.cls}`}>{b.label}</span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              msg.role === 'assistant'
                ? 'bg-gradient-to-br from-purple-500 to-[#E8431A]'
                : 'bg-gray-700'
            }`}>
              {msg.role === 'assistant'
                ? <Bot className="w-4 h-4 text-white" />
                : <User className="w-4 h-4 text-gray-300" />
              }
            </div>
            <div className={`max-w-lg space-y-2 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'assistant'
                  ? 'bg-gray-900 border border-gray-800 text-gray-300'
                  : 'bg-[#E8431A]/20 border border-[#E8431A]/30 text-gray-200'
              }`}>
                <div className="space-y-1">{renderContent(msg.content)}</div>
              </div>

              {/* Action results */}
              {msg.actions?.map((action, ai) => (
                <div key={ai} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${
                  action.status === 'done'  ? 'bg-green-900/20 border-green-700/30 text-green-400' :
                  action.status === 'error' ? 'bg-red-900/20 border-red-700/30 text-red-400' :
                  'bg-gray-800 border-gray-700 text-gray-400'
                }`}>
                  <Zap className="w-3 h-3" />
                  <span>{action.label}</span>
                  {action.result && <span className="mr-auto font-medium">{action.result}</span>}
                </div>
              ))}

              <p className="text-xs text-gray-700">
                {msg.timestamp.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-[#E8431A] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[#E8431A] animate-spin" />
              <span className="text-sm text-gray-500">يفكر...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick commands */}
      <div className="px-6 py-3 border-t border-gray-800 flex gap-2 overflow-x-auto">
        {QUICK_COMMANDS.map(cmd => (
          <button
            key={cmd.label}
            onClick={() => sendMessage(cmd.prompt)}
            disabled={loading}
            className="text-xs whitespace-nowrap px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-lg border border-gray-700 transition disabled:opacity-50"
          >
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-2">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="اكتب سؤالك أو أمرك بالعربية أو الدارجة..."
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:ring-1 focus:ring-[#E8431A] outline-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-[#E8431A] hover:bg-[#C73615] disabled:opacity-40 text-white p-3 rounded-xl transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
