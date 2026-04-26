AERCE DECISION TRACE POLICY

For every shipment evaluation, the system MUST record:

- AERCE_CORE version
- Input hash (raw input checksum)
- Pipeline execution order
- Compliance outcome
- Timestamp (UTC)
- Reason codes for NON_COMPLIANT or RISK

Purpose:
- Enable replay of decisions
- Support third-party audits
- Ensure non-repudiation

No trace = decision invalid.
