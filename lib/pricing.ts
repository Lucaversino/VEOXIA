export type Pricing = {
 image_usd: number; usd_brl: number; overhead_brl: number;
 fee_percent: number; safety_percent: number; credit_brl: number;
 valid_until: string; public_enabled: boolean; daily_limit: number;
 daily_budget_brl: number;
};
export function imageQuote(p: Pricing, now = Date.now()) {
 const nums=[p.image_usd,p.usd_brl,p.overhead_brl,p.fee_percent,p.safety_percent,p.credit_brl,p.daily_limit,p.daily_budget_brl];
 if(nums.some(x=>!Number.isFinite(x)) || p.image_usd<=0 || p.usd_brl<=0 || p.credit_brl<=0 || p.overhead_brl<0 || p.safety_percent<0 || p.fee_percent<0 || p.fee_percent>=50 || !Number.isInteger(p.daily_limit) || p.daily_limit<1 || p.daily_budget_brl<=0) throw Error('Preços ainda não configurados pelo administrador.');
 if(!Number.isFinite(Date.parse(p.valid_until)) || Date.parse(p.valid_until)<=now) throw Error('A tabela de preços precisa ser atualizada. A geração está pausada.');
 const costBrl=(p.image_usd*p.usd_brl+p.overhead_brl)*(1+p.safety_percent/100);
 // 100% markup on buffered operational cost, after proportional selling fees.
 const credits=Math.ceil((2*costBrl/(1-p.fee_percent/100))/p.credit_brl);
 if(!Number.isSafeInteger(credits)||credits<1||credits>1000000)throw Error('Preço fora do limite permitido.');
 return {credits,retailBrl:credits*p.credit_brl,costBrl,providerUsd:p.image_usd,creditBrl:p.credit_brl};
}
