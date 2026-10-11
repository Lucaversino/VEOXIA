import {NextResponse} from 'next/server';
export async function GET(){return NextResponse.json({items:[]})}
export async function POST(){return NextResponse.json({error:'A criação de vozes ainda não está disponível. Nenhum crédito foi descontado.'},{status:503})}
