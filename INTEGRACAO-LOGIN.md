# Login VEOX IA 2.3

- Componente: `components/ui/sign-in-page.tsx`.
- Estilos escopados: `app/globals.css`; preserva as cores VEOX (#0b0e12, #dcff23).
- Projeto original: Next.js App Router + TypeScript; já inclui `lucide-react`. NÃO adicionar `react-router-dom` (conflita com roteamento Next).
- A tela aparece quando o visitante toca em Entrar; no celular ocupa a tela inteira.
- Supabase: login por e-mail/senha, login Google e recuperação de senha reais, sem credenciais hardcoded.
- O botão GitHub do modelo foi omitido porque o provedor GitHub não foi confirmado como habilitado.
- O botão de cadastro foi omitido para não abrir registro livre sem política de créditos, convites e antispam.
- `rememberMe` é visual e não altera o comportamento de persistência do Supabase nesta versão; o Supabase persiste sessão por padrão.
- A imagem da área esquerda usa Unsplash, com fallback visual escuro se indisponível.
- Estrutura de componentes: `components/ui`, alias `@/components/ui`.
- Este projeto não tinha Tailwind/shadcn; o componente foi implementado com CSS isolado sem depender deles, para não adicionar pacotes nem arriscar o build. Para adotar shadcn/Tailwind no projeto inteiro, execute `npx shadcn@latest init` e siga o assistente; configure `components.json` para `@/components/ui` e estilo global `app/globals.css`, após testar o impacto no CSS existente.
- O erro Google 401 invalid_client pode continuar caso o Client ID informado ao Google esteja incorreto; a troca de UI não o corrige por si só.
