# Data Contracts

## What is a Contract?

A **contract** is a shared definition of data structure that both the frontend (`apps/web`) and backend (`apps/api`) use to ensure type safety and data consistency. Each contract consists of:

1. **Zod schema** - Runtime validation schema
2. **TypeScript type** - Type inferred from the Zod schema

## Why Contracts Live in `packages/shared`

Contracts live in `packages/shared` to:

- **Prevent type drift** - Frontend and backend always use the exact same types
- **Single source of truth** - Changes to data structures happen in one place
- **Runtime validation** - Zod schemas validate data at runtime (e.g., API responses, request bodies)
- **Type safety** - TypeScript ensures correct usage at compile time

## Usage

### Importing Types and Schemas

```typescript
import { Person, PersonSchema } from "@cuelens/shared/contracts";
// or
import { Person, PersonSchema } from "@cuelens/shared";
```

### Validating Incoming Data

Use Zod's `.parse()` or `.safeParse()` to validate data:

```typescript
import { PersonSchema } from "@cuelens/shared";

// Strict parsing (throws on invalid data)
try {
  const person = PersonSchema.parse(incomingData);
  // person is now typed as Person
} catch (error) {
  // Handle validation error
}

// Safe parsing (returns success/error result)
const result = PersonSchema.safeParse(incomingData);
if (result.success) {
  const person = result.data; // Typed as Person
} else {
  console.error(result.error); // ZodError
}
```

### Using Types Only (No Runtime Validation)

```typescript
import type { Person } from "@cuelens/shared";

function processPerson(person: Person) {
  // TypeScript ensures person matches the Person contract
  console.log(person.displayName);
}
```

## Best Practices

1. **Always validate at API boundaries** - Parse incoming requests/responses using Zod schemas
2. **Use types internally** - Once validated, use TypeScript types for internal logic
3. **Never modify contracts without updating both apps** - Contracts are shared, changes affect both sides
4. **Keep contracts focused** - Each contract should represent a single domain concept

## Available Contracts

- `Person` - Represents a person in the memory aid system
- `Place` - Represents a place in the memory aid system
- `VisionEvent` - Events detected from camera/vision analysis
- `Suggestion` - Memory suggestions that can be approved/rejected
