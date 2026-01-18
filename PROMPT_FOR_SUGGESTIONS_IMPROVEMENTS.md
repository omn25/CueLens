# Prompt for Cursor: Enhance Suggestions System with Duplicate Detection and Photo Capture

## Context
The CueLens system generates suggestions for adding people and places based on STT (Speech-to-Text) transcripts. The STT system is working correctly and should NOT be modified.

## Current System Overview
- Suggestions are created in `apps/api/src/engine/suggestionEngine.ts` from transcripts
- Suggestions API is in `apps/api/src/routes/suggestions.ts`
- Person store is in `apps/api/src/store/peopleStore.ts`
- Suggestion UI is in `apps/web/src/app/suggestions/page.tsx`
- Contract schemas are in `packages/shared/src/contracts/suggestion.ts` and `person.ts`

## Requirements

### 1. Confidence Score Display
- ✅ Confidence score is already calculated in `suggestionEngine.ts`
- ✅ Confidence is stored in `evidence.confidence`
- ✅ UI already displays confidence in suggestions page
- **Action**: Verify confidence is displayed for ALL suggestion types (relationship_suggestion, identify_person, identify_place)

### 2. Photo Capture for Suggestions
When a suggestion of type `relationship_suggestion` or `identify_person` is created:
- The suggestion already has `evidence.frameAssetId` if a frame was captured
- **Ensure**: When creating suggestions in `suggestionEngine.ts`, always pass `frameAssetId` from the context
- **Add**: Display the captured photo in the suggestions UI if `frameAssetId` exists
- **Verify**: Photo is shown in approval modal for relationship and name suggestions

### 3. Memory Reminders Toggle
- ✅ The approval modal already has `remindersEnabled` checkbox for `identify_person` suggestions
- **Action**: Add `remindersEnabled` checkbox for `relationship_suggestion` type as well
- **Update**: In `approveSuggestionHandler`, ensure `remindersEnabled` is saved when approving relationship suggestions

### 4. Duplicate Detection (Most Important)
Before creating a suggestion, check if the person already exists:

**In `suggestionEngine.ts` function `generateSuggestionsFromTranscript`:**

For `identify_person` suggestions:
- Before creating suggestion, check existing people using `listPeople()` from `peopleStore.ts`
- Compare the proposed `displayName` (case-insensitive) with existing people
- If exact name match found:
  - **DO NOT create suggestion** (skip it entirely to avoid duplicates)
  
For `relationship_suggestion` suggestions:
- Check if a person with that relationship already exists
- If exact relationship match found:
  - **DO NOT create suggestion** (skip it entirely)

**If uncertain (same name but different person, or ambiguous match):**
- Add a `duplicateFlag` field to the suggestion's `evidence` object
- Set `evidence.duplicateFlag = true` 
- Still create the suggestion, but mark it for review

**Face comparison (future-proof):**
- If `frameAssetId` exists, store it in the suggestion
- When comparing, if we have both name match AND frame available, flag as potential duplicate
- Note: Full face recognition is not required now, just flag if name matches

### 5. Approval Flow Enhancement
When approving a suggestion (`POST /suggestions/:id/approve`):

**For `identify_person` suggestions:**
- ✅ Already creates/updates person via `upsertPerson()`
- **Ensure**: `remindersEnabled` is saved
- **Ensure**: `photoAssetId` from `evidence.frameAssetId` is saved
- **Add**: If suggestion has `evidence.duplicateFlag === true`, show warning in UI before approval

**For `relationship_suggestion` suggestions:**
- Currently only approves, doesn't create person
- **Add**: Create person if it doesn't exist when relationship suggestion is approved
- Use `evidence.frameAssetId` as `photoAssetId`
- Use relationship as `relationship` field
- Use `remindersEnabled` from approval body

### 6. Suggestion Contract Updates
If adding `duplicateFlag` to evidence:
- Update `SuggestionSchema` in `packages/shared/src/contracts/suggestion.ts`
- Add `duplicateFlag?: boolean` to `evidence` object in both schema and type

## Implementation Steps

1. **Update suggestion generation** (`suggestionEngine.ts`):
   - Add duplicate checking before creating suggestions
   - Import `listPeople` from `peopleStore.ts`
   - Skip suggestions if exact match found
   - Set `duplicateFlag` if uncertain match

2. **Update suggestion approval** (`suggestions.ts` route):
   - Handle `relationship_suggestion` approval to create person
   - Save `remindersEnabled` for both types
   - Save `photoAssetId` from frame

3. **Update suggestion UI** (`suggestions/page.tsx`):
   - Show `remindersEnabled` checkbox for `relationship_suggestion` type
   - Show warning if `duplicateFlag === true`
   - Display confidence score prominently

4. **Update contracts** (`contracts/suggestion.ts`):
   - Add `duplicateFlag?: boolean` to evidence schema if needed

## Important Constraints

- ❌ **DO NOT modify STT code** - It's working correctly
- ✅ Keep existing suggestion creation logic intact
- ✅ Maintain backward compatibility with existing suggestions
- ✅ Ensure all existing tests still pass

## Testing Checklist

- [ ] Suggestions with existing names are NOT created
- [ ] Suggestions with existing relationships are NOT created  
- [ ] Uncertain matches are flagged with `duplicateFlag`
- [ ] Approving `identify_person` creates person with photo and reminders
- [ ] Approving `relationship_suggestion` creates person with photo and reminders
- [ ] Confidence scores display for all suggestion types
- [ ] Photos display in suggestions list and approval modal
- [ ] Memory reminders toggle works for both suggestion types
