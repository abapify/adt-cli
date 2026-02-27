# adt-fixtures TODO

## Fixtures Needed

Real SAP XML responses needed for complete test coverage. Collect from SAP systems and sanitize before adding.

### Transport (✅ Done)

- [x] `transport/single.xml` - GET transportrequests/{id}
- [x] `transport/create.xml` - POST transportrequests body

### ATC (❌ Missing)

- [ ] `atc/worklist.xml` - GET/POST atc/worklists/{id}, atc/runs
  - Current file is placeholder
  - Need real `<atc:worklist>` response
- [ ] `atc/result.xml` - GET atc/results
  - Current file has wrong root (`checkresult` vs `worklist`)
  - Need real `<atc:worklist>` or separate `checkresult` schema

### Discovery (❌ Missing)

- [ ] `discovery/service.xml` - GET /sap/bc/adt/discovery
  - AtomPub service document
  - Large response, may need to trim

### OO Classes (✅ Partial)

- [x] `oo/class.xml` - GET oo/classes/{name}
- [ ] `oo/class-source.txt` - GET oo/classes/{name}/source/main (plain text)

### OO Interfaces (✅ Partial)

- [x] `oo/interface.xml` - GET oo/interfaces/{name}
- [ ] `oo/interface-source.txt` - GET oo/interfaces/{name}/source/main (plain text)

### Packages (❌ Missing)

- [ ] `packages/package.xml` - GET packages/{name}

## How to Collect

1. Use ADT client to make real SAP calls
2. Save raw XML response
3. **Sanitize**: Remove real transport numbers, usernames, system names
4. Use mock identifiers: `DEVK900001`, `DEVELOPER`, `DEV`, etc.
5. Add to `src/fixtures/{category}/`
6. Register in `src/fixtures/registry.ts`

## Security Reminder

⚠️ **Never commit real Booking.com data to this submodule**

- No real transport numbers (use DEVK*, MOCK*, TEST\*)
- No real usernames
- No real system names or URLs
