# Contrato de autenticação esperado pelo mobile

O mobile foi implementado contra esses endpoints. O módulo `apps/api/src/modules/auth` deve seguir exatamente este contrato. Caso a API divirja, ajustar em [src/lib/api/auth.ts](../src/lib/api/auth.ts).

## `POST /auth/login`

**Request**
```json
{ "email": "string", "senha": "string" }
```

**Response 200**
```json
{
  "user": {
    "id": "uuid",
    "nome": "string",
    "email": "string",
    "role": "paciente" | "nutricionista"
  },
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

**Erros**
- `401` — credenciais inválidas
- `400` — payload mal formado

## `POST /auth/cadastro`

**Request**
```json
{
  "nome": "string",
  "email": "string",
  "senha": "string (>= 8)",
  "role": "paciente" | "nutricionista"
}
```

**Response 201** — mesmo formato do login.

**Erros**
- `409` — e-mail já cadastrado
- `400` — payload mal formado

## `POST /auth/refresh` (opcional, mas recomendado)

**Request**
```json
{ "refreshToken": "jwt" }
```

**Response 200**
```json
{ "accessToken": "jwt", "refreshToken": "jwt" }
```

## `POST /auth/logout` (opcional)

Header `Authorization: Bearer <accessToken>` → `204`.

## Convenções

- Senhas trafegam apenas em HTTPS, sempre como `senha` (português). Hash com bcrypt no servidor.
- `accessToken` curto (~15min), `refreshToken` longo (~30 dias).
- Erros seguem o formato padrão do Nest: `{ statusCode, message, error }`.
