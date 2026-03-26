---
trigger: model_decision
description: Mapping of SAP ADT DDIC objects to their root elements and schemas.
---

# SAP ADT DDIC Object Mapping

SAP ADT wraps DDIC object responses in different root elements depending on the object type.

## Mappings

### DOMA (Domain)
- **Root Element:** `domain`
- **Namespace:** `http://www.sap.com/adt/dictionary/domains`
- **Schema:** `sap/domain.xsd`
- **Notes:** Direct extension of `adtcore:AdtMainObject`. Works out of the box.

### DTEL (Data Element)
- **Root Element:** `blue:wbobj`
- **Namespace:** `http://www.sap.com/wbobj/dictionary/dtel`
- **Inner Content:** Wraps `dtel:dataElement`.
- **Schema:** `.xsd/custom/dataelementWrapper.xsd`
- **ADK wrapperKey:** `'wbobj'`

### TABL (Table) / Structure
- **Root Element:** `blue:blueSource`
- **Namespace:** `http://www.sap.com/wbobj/blue`
- **Schema:** `.xsd/custom/blueSource.xsd`
- **ADK wrapperKey:** `'blueSource'`
- **Notes:** Extends `abapsource:AbapSourceMainObject`. Contracts use `crud()` helper.

### TTYP (Table Type)
- **Root Element:** `tableType`
- **Namespace:** `http://www.sap.com/dictionary/tabletype`
- **Schema:** `sap/tabletype.xsd`
- **Notes:** Direct extension of `adtcore:AdtMainObject`. Works out of the box.

## Locking
- **Header:** Lock operations require `Accept: application/*,application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result`.
