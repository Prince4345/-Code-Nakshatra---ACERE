AERCE EXECUTION PIPELINE

STEP 1: Input Parser Agent
- Extract raw fields
- No logic

STEP 2: Field Validator Agent
- Identify missing or invalid data
- No correction

STEP 3: Applicability Classifier Agent
- Decide CBAM/EUDR applicability ONLY

STEP 4: AERCE_CORE
- Apply compliance logic
- Enforce output contract
- Generate FINAL JSON

STEP 5: Report Formatter (optional)
- Read-only
- Cannot modify output

ENFORCEMENT:
- No agent may bypass AERCE_CORE
- No agent may override final output
- Pipeline is linear and immutable
