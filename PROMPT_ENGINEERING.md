# Prompt Engineering Lessons Learned

This document captures important lessons learned while developing and debugging LLM prompts for this plugin.

## Critical Lesson: Examples Override Instructions

### The Problem

**Date**: 2025-11-17
**Issue**: LLM (Mistral) was consistently returning exactly 3 tags when minimum was set to 4+ tags.

### Root Cause Analysis

The prompt contained **conflicting signals**:

**Instruction (Abstract):**
```
You MUST select between 4 and 10 THEMATIC tags
```

**Example (Concrete):**
```
Format your response EXACTLY like this:
Summary: [your summary here]
Suggested tags: tag1, tag2, tag3
```

The example showed **3 tags**, contradicting the instruction to return 4-10 tags.

### What Happened

LLMs (particularly instruction-tuned models like Mistral) are **extremely sensitive to examples**. When faced with:
- An abstract instruction ("select between X and Y")
- A concrete example showing specific format

The LLM will **prioritize the concrete example** because it's more specific and actionable.

**Result**: Mistral consistently returned exactly 3 tags (matching the example) regardless of the minTags setting.

### The Fix

Changed the hardcoded example to a **dynamic example** that reflects the actual settings:

**Before:**
```javascript
Suggested tags: tag1, tag2, tag3  // Always 3 tags
```

**After:**
```javascript
Suggested tags: ${Array.from({length: this.settings.minTags}, (_, i) => `tag${i+1}`).join(', ')}
```

**Result**:
- If `minTags = 4`: Example shows `tag1, tag2, tag3, tag4`
- If `minTags = 5`: Example shows `tag1, tag2, tag3, tag4, tag5`
- If `minTags = 7`: Example shows `tag1, tag2, tag3, tag4, tag5, tag6, tag7`

### Outcome

✅ LLM now consistently returns the correct number of tags matching the minTags/maxTags settings.

## Best Practices for LLM Prompts

### 1. Examples Should Reinforce Instructions, Not Contradict Them

❌ **Bad:**
```
Instruction: Generate 5-10 items
Example: item1, item2, item3
```

✅ **Good:**
```
Instruction: Generate 5-10 items
Example: item1, item2, item3, item4, item5, item6
```

Or even better - make examples dynamic to match your requirements.

### 2. Concrete Beats Abstract

When in conflict, LLMs will follow:
1. **Concrete examples** (highest priority)
2. **Specific instructions**
3. **General guidelines** (lowest priority)

**Lesson**: Make sure your examples demonstrate exactly what you want.

### 3. Show, Don't Just Tell

Instead of:
```
Return between 4 and 10 tags
```

Prefer:
```
Return between 4 and 10 tags

Example with 5 tags:
tag1, tag2, tag3, tag4, tag5
```

### 4. Use Dynamic Examples When Possible

For configurable systems, generate examples that match the current configuration:

```javascript
// Dynamic example generation
const exampleTags = Array.from(
    {length: settings.minTags},
    (_, i) => `tag${i+1}`
).join(', ');

prompt += `Example: ${exampleTags}`;
```

This ensures the example always aligns with user settings.

### 5. Test Prompts With Different Settings

Don't just test with default values. Test with:
- Minimum values (e.g., minTags = 1)
- Maximum values (e.g., maxTags = 20)
- Edge cases (e.g., minTags = maxTags)
- Various combinations

### 6. Log Everything During Development

When debugging LLM behavior, log:
- The exact prompt sent
- The raw LLM response
- Parsing/filtering steps
- Final output

This creates an audit trail that makes bugs obvious.

**Example from this fix:**
```javascript
console.log('=== PROMPT SENT TO LLM ===');
console.log(`Min tags: ${minTags}, Max tags: ${maxTags}`);
console.log('=== LLM RESPONSE ===');
console.log(llmResponse);
console.log('LLM suggested X tags:', rawTags);
console.log('Valid tags after filtering:', cleanedTags);
```

### 7. Common LLM Prompt Pitfalls

#### Pitfall 1: Vague Ranges
❌ "Return some tags"
✅ "Return between 4 and 10 tags"

#### Pitfall 2: Contradictory Instructions
❌ "Return 5-10 tags" + example showing 3 tags
✅ "Return 5-10 tags" + example showing 5 tags

#### Pitfall 3: Assuming LLM Will "Figure It Out"
❌ "Return an appropriate number of tags"
✅ "Return exactly 5 tags" or "Return between 4 and 10 tags, preferring around 6-7"

#### Pitfall 4: Too Many Instructions
LLMs can get confused with 20+ rules. Prioritize:
- **CRITICAL RULES** (must follow)
- **IMPORTANT** (should follow)
- **OPTIONAL** (nice to have)

## Debugging Methodology

When an LLM isn't behaving as expected:

### Step 1: Log the Prompt
```javascript
console.log('Prompt sent:', prompt);
```
Check if the prompt actually says what you think it says.

### Step 2: Log the Raw Response
```javascript
console.log('LLM response:', response);
```
Is the LLM following instructions at all?

### Step 3: Check for Conflicts
- Do examples match instructions?
- Are there contradictory rules?
- Is the format example correct?

### Step 4: Simplify
Remove all optional rules and test with minimal prompt. Add complexity back one rule at a time.

### Step 5: Try Different Models
Some models are better at following instructions than others:
- **Mistral**: Good at following format, sensitive to examples
- **Llama**: More creative, may deviate from strict rules
- **GPT-4**: Best at complex instructions, handles conflicts better

## Model-Specific Notes

### Mistral
- Excellent at following format examples
- Very literal with examples
- Prefers concrete over abstract
- **Best practice**: Make examples perfect, instructions can be brief

### Llama 2/3
- More creative/flexible
- May ignore strict rules for "better" output
- Good for creative tasks
- **Best practice**: Emphasize rules, use "MUST" and "CRITICAL"

## Version History

- **2025-11-17**: Initial document created based on the "3 tags bug" discovery
  - Added: Examples Override Instructions lesson
  - Added: Dynamic example generation pattern
  - Added: Debugging methodology

---

## Contributing to This Document

If you discover new prompt engineering insights while working on this plugin, please add them here with:
- Date discovered
- The problem observed
- Root cause analysis
- The fix applied
- Lessons learned

This helps future developers (including future you!) avoid the same pitfalls.
