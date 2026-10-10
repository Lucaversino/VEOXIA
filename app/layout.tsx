import type { Metadata } from 'next';
import './globals.css';
const url=process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const metadata:Metadata={metadataBase:new URL(url),title:{default:'VEOX AI Influencer Studio | Crie personagens virtuais',template:'%s | VEOX Studio'},description:'Estúdio de criação de influencers virtuais com identidade visual, imagens, vídeos e vozes autorizadas. Controle seu conteúdo em um só lugar.',robots:{index:true,follow:true},openGraph:{type:'website',title:'VEOX AI Influencer Studio',description:'Crie e gerencie personagens virtuais para produção criativa.',url,siteName:'VEOX AI Influencer Studio'},twitter:{card:'summary_large_image'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
