'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Truck, CreditCard, CheckCircle, Loader2, Banknote } from 'lucide-react'
import WilayaSelector from '@/components/ui/WilayaSelector'

const STEPS = ['معلومات التوصيل','طريقة الدفع','تأكيد الطلب']
const CART_ITEMS = [{ name:'منتج تجريبي', price:2500, qty:1, emoji:'📦' }]

export default function CheckoutPage() {
  const [step,setStep]=useState(0),[done,setDone]=useState(false)
  const [wilaya,setWilaya]=useState<number|null>(null),[payment,setPayment]=useState<'cod'|'ccp'>('cod')
  const [form,setForm]=useState({name:'',phone:'',address:''}),[loading,setLoading]=useState(false)
  const subtotal=CART_ITEMS.reduce((s,i)=>s+i.price*i.qty,0), deliveryFee=wilaya?500:0, total=subtotal+deliveryFee

  const handleNext = () => {
    if (step<STEPS.length-1) setStep(s=>s+1)
    else { setLoading(true); setTimeout(()=>{setLoading(false);setDone(true)},1500) }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--color-bg-soft)'}} dir="rtl">
      <div className="card p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{background:'var(--color-success-soft)'}}>
          <CheckCircle size={32} style={{color:'var(--color-success)'}}/>
        </div>
        <h2 className="font-bold text-xl" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>تم تأكيد طلبك! 🎉</h2>
        <p className="text-sm" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>سنتصل بك قريباً لتأكيد التوصيل</p>
        <Link href="/" className="btn btn-primary w-full" style={{fontFamily:'var(--font-arabic)'}}>العودة للرئيسية</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'var(--color-bg-soft)'}} dir="rtl">
      <header className="bg-white border-b px-4 h-14 flex items-center justify-between" style={{borderColor:'var(--color-border)'}}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white" style={{background:'var(--color-accent)'}}>د</div>
          <span className="font-black text-lg" style={{color:'var(--color-text-primary)'}}>دكاني</span>
        </Link>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s,i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all"
                style={{background:i<=step?'var(--color-accent)':'var(--color-border)'}}>
                {i<step?'✓':i+1}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{color:i===step?'var(--color-accent)':'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{s}</span>
              {i<STEPS.length-1&&<ChevronRight size={14} style={{color:'var(--color-border)'}} className="hidden sm:block"/>}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-4">
            {step===0&&(
              <div className="card p-5 space-y-4">
                <h2 className="font-semibold text-sm flex items-center gap-2" style={{color:'var(--color-text-primary)'}}>
                  <Truck size={15} style={{color:'var(--color-accent)'}}/><span style={{fontFamily:'var(--font-arabic)'}}>معلومات التوصيل</span>
                </h2>
                {[{label:'الاسم الكامل *',key:'name',ph:'محمد بن علي'},{label:'رقم الهاتف *',key:'phone',ph:'0555 xx xx xx'}].map(f=>(
                  <div key={f.key}>
                    <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>{f.label}</label>
                    <input value={form[f.key as keyof typeof form]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} className="input text-sm"/>
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>الولاية *</label>
                  <WilayaSelector value={wilaya} onChange={w=>setWilaya(w?.id??null)}/>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>العنوان التفصيلي</label>
                  <input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="الحي، الشارع، رقم البناية..." className="input text-sm"/>
                </div>
              </div>
            )}
            {step===1&&(
              <div className="card p-5 space-y-3">
                <h2 className="font-semibold text-sm flex items-center gap-2" style={{color:'var(--color-text-primary)'}}>
                  <CreditCard size={15} style={{color:'var(--color-accent)'}}/><span style={{fontFamily:'var(--font-arabic)'}}>طريقة الدفع</span>
                </h2>
                {[{id:'cod' as const,label:'الدفع عند الاستلام',desc:'تدفع نقداً عند وصول طلبك',icon:Banknote},{id:'ccp' as const,label:'بطاقة CCP / CIB',desc:'دفع إلكتروني آمن',icon:CreditCard}].map(opt=>(
                  <label key={opt.id} className="flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all"
                    style={{borderColor:payment===opt.id?'var(--color-accent)':'var(--color-border)',background:payment===opt.id?'var(--color-accent-soft)':'#fff'}}>
                    <input type="radio" name="payment" checked={payment===opt.id} onChange={()=>setPayment(opt.id)} className="w-4 h-4 accent-[#0D6EFD]"/>
                    <opt.icon size={18} style={{color:payment===opt.id?'var(--color-accent)':'var(--color-text-muted)'}}/>
                    <div>
                      <p className="font-semibold text-sm" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>{opt.label}</p>
                      <p className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {step===2&&(
              <div className="card p-5 space-y-3">
                <h2 className="font-semibold text-sm" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>مراجعة الطلب</h2>
                {[{label:'الاسم',value:form.name||'—'},{label:'الهاتف',value:form.phone||'—'},{label:'طريقة الدفع',value:payment==='cod'?'الدفع عند الاستلام':'بطاقة CCP/CIB'}].map(r=>(
                  <div key={r.label} className="flex justify-between text-sm py-2 border-b" style={{borderColor:'var(--color-border)'}}>
                    <span style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{r.label}</span>
                    <span className="font-medium" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>{r.value}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              {step>0&&<button onClick={()=>setStep(s=>s-1)} className="btn btn-ghost" style={{fontFamily:'var(--font-arabic)'}}>رجوع</button>}
              <button onClick={handleNext} disabled={loading} className="btn btn-primary flex-1 gap-2" style={{fontFamily:'var(--font-arabic)'}}>
                {loading?<><Loader2 size={15} className="animate-spin"/>جارٍ التأكيد...</>:step===STEPS.length-1?'تأكيد الطلب':'التالي ←'}
              </button>
            </div>
          </div>
          {/* Summary */}
          <div className="lg:col-span-2">
            <div className="card p-4 lg:sticky lg:top-20 space-y-3">
              <h3 className="font-semibold text-sm" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>ملخص الطلب</h3>
              {CART_ITEMS.map(item=>(
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{background:'var(--color-bg-soft)'}}>{item.emoji}</div>
                  <div className="flex-1"><p className="text-sm font-medium" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>{item.name}</p><p className="text-xs" style={{color:'var(--color-text-muted)'}}>×{item.qty}</p></div>
                  <p className="text-sm font-bold" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{item.price.toLocaleString('ar-DZ')} دج</p>
                </div>
              ))}
              <div className="border-t pt-3 space-y-1.5" style={{borderColor:'var(--color-border)'}}>
                {[{label:'المجموع الجزئي',value:`${subtotal.toLocaleString('ar-DZ')} دج`},{label:'التوصيل',value:deliveryFee?`${deliveryFee.toLocaleString('ar-DZ')} دج`:'—'}].map(r=>(
                  <div key={r.label} className="flex justify-between text-sm">
                    <span style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{r.label}</span>
                    <span style={{fontFamily:'var(--font-primary)'}}>{r.value}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1.5 border-t" style={{borderColor:'var(--color-border)'}}>
                  <span style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>الإجمالي</span>
                  <span style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)',fontSize:'16px'}}>{total.toLocaleString('ar-DZ')} دج</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
