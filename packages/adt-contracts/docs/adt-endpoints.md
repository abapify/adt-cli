# ADT Endpoints Reference

> Auto-generated from SAP ADT discovery data.
> To enable an endpoint, add it to `adt-codegen` config/enabled-endpoints.json

## Enabled Endpoints (9)

These endpoints have generated contracts in `src/generated/adt/`:

| Endpoint                                                               | Title                                      | Category                        |
| ---------------------------------------------------------------------- | ------------------------------------------ | ------------------------------- |
| `/sap/bc/adt/atc/results`                                              | ATC results                                | atcresults                      |
| `/sap/bc/adt/atc/worklists`                                            | ATC worklist                               | atcworklists                    |
| `/sap/bc/adt/cts/transportrequests`                                    | Transport Management                       | transportmanagement             |
| `/sap/bc/adt/cts/transportrequests/reference`                          | Transport Management                       | transportmanagementref          |
| `/sap/bc/adt/cts/transportrequests/searchconfiguration/configurations` | Transport Search Configurations            | transportconfigurations         |
| `/sap/bc/adt/cts/transportrequests/searchconfiguration/metadata`       | Transport Search Configurations (Metadata) | transportconfigurationsmetadata |
| `/sap/bc/adt/packages`                                                 | Package                                    | devck                           |
| `/sap/bc/adt/packages/settings`                                        | Package Settings                           | settings                        |
| `/sap/bc/adt/packages/validation`                                      | Package Name Validation                    | devck/validation                |

## Available Endpoints (Not Yet Enabled) (530)

These endpoints were discovered but no contracts are generated yet:

### /sap/bc/adt (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint      | Title                         |
| ------------- | ----------------------------- |
| `/sap/bc/adt` | ADT HTTP(S) Endpoint          |
| `/sap/bc/adt` | ADT Stateful HTTP(S) Endpoint |

</details>

### /sap/bc/adt/abapdaemons (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                | Title                       |
| ------------------------------------------------------- | --------------------------- |
| `/sap/bc/adt/abapdaemons/applications`                  | ABAP Daemon                 |
| `/sap/bc/adt/abapdaemons/applications/$configuration`   | JSON Configuration          |
| `/sap/bc/adt/abapdaemons/applications/$schema`          | JSON Schema                 |
| `/sap/bc/adt/abapdaemons/applications/source/formatter` | JSON Formatter              |
| `/sap/bc/adt/abapdaemons/applications/validation`       | ABAP Daemon Name Validation |

</details>

### /sap/bc/adt/abapsource (12 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                  | Title                      |
| --------------------------------------------------------- | -------------------------- |
| `/sap/bc/adt/abapsource/abapdoc/exportjobs`               | Export ABAP Doc            |
| `/sap/bc/adt/abapsource/cleanup/source`                   | Cleanup                    |
| `/sap/bc/adt/abapsource/codecompletion/elementinfo`       | Element Info               |
| `/sap/bc/adt/abapsource/codecompletion/hanacatalogaccess` | HANA Catalog Access        |
| `/sap/bc/adt/abapsource/codecompletion/insertion`         | Code Insertion             |
| `/sap/bc/adt/abapsource/codecompletion/proposal`          | Code Completion            |
| `/sap/bc/adt/abapsource/occurencemarkers`                 | Occurrence Markers         |
| `/sap/bc/adt/abapsource/parsers/rnd/grammar`              | Parser                     |
| `/sap/bc/adt/abapsource/prettyprinter`                    | Pretty Printer             |
| `/sap/bc/adt/abapsource/prettyprinter/settings`           | Pretty Printer Settings    |
| `/sap/bc/adt/abapsource/syntax/configurations`            | ABAP Syntax Configurations |
| `/sap/bc/adt/abapsource/typehierarchy`                    | Type Hierarchy             |

</details>

### /sap/bc/adt/abapunit (3 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                   | Title                         |
| ------------------------------------------ | ----------------------------- |
| `/sap/bc/adt/abapunit/metadata`            | ABAP Unit Metadata            |
| `/sap/bc/adt/abapunit/testruns`            | ABAP Unit Testruns            |
| `/sap/bc/adt/abapunit/testruns/evaluation` | ABAP Unit Testruns Evaluation |

</details>

### /sap/bc/adt/acm (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                               | Title                           |
| -------------------------------------- | ------------------------------- |
| `/sap/bc/adt/acm/dcl/elementinfo`      | DCL Element Info Resource       |
| `/sap/bc/adt/acm/dcl/parser`           | DCL Parser Information Resource |
| `/sap/bc/adt/acm/dcl/repositoryaccess` | ACM Repository Objects Resource |
| `/sap/bc/adt/acm/dcl/sources`          | DCL Sources                     |
| `/sap/bc/adt/acm/dcl/validation`       | DCL Sources Validation          |

</details>

### /sap/bc/adt/activation (4 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                 | Title                    |
| ---------------------------------------- | ------------------------ |
| `/sap/bc/adt/activation`                 | Activation               |
| `/sap/bc/adt/activation/inactiveobjects` | Inactive Objects         |
| `/sap/bc/adt/activation/results`         | Activation result        |
| `/sap/bc/adt/activation/runs`            | Activation in background |

</details>

### /sap/bc/adt/amdp (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                         | Title              |
| -------------------------------- | ------------------ |
| `/sap/bc/adt/amdp/debugger/main` | AMDP Debugger Main |

</details>

### /sap/bc/adt/ana (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint              | Title                   |
| --------------------- | ----------------------- |
| `/sap/bc/adt/ana/aqd` | Analytical custom query |

</details>

### /sap/bc/adt/apireleases (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                  | Title        |
| ------------------------- | ------------ |
| `/sap/bc/adt/apireleases` | API Releases |

</details>

### /sap/bc/adt/applicationjob (10 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                | Title                                         |
| ------------------------------------------------------- | --------------------------------------------- |
| `/sap/bc/adt/applicationjob/catalogs`                   | Application Job Catalog Entry                 |
| `/sap/bc/adt/applicationjob/catalogs/$configuration`    | JSON Configuration                            |
| `/sap/bc/adt/applicationjob/catalogs/$schema`           | JSON Schema                                   |
| `/sap/bc/adt/applicationjob/catalogs/source/formatter`  | JSON Formatter                                |
| `/sap/bc/adt/applicationjob/catalogs/validation`        | Application Job Catalog Entry Name Validation |
| `/sap/bc/adt/applicationjob/templates`                  | Application Job Template                      |
| `/sap/bc/adt/applicationjob/templates/$configuration`   | JSON Configuration                            |
| `/sap/bc/adt/applicationjob/templates/$schema`          | JSON Schema                                   |
| `/sap/bc/adt/applicationjob/templates/source/formatter` | JSON Formatter                                |
| `/sap/bc/adt/applicationjob/templates/validation`       | Application Job Template Name Validation      |

</details>

### /sap/bc/adt/applicationlog (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                              | Title                                  |
| ----------------------------------------------------- | -------------------------------------- |
| `/sap/bc/adt/applicationlog/objects`                  | Application Log Object                 |
| `/sap/bc/adt/applicationlog/objects/$configuration`   | JSON Configuration                     |
| `/sap/bc/adt/applicationlog/objects/$schema`          | JSON Schema                            |
| `/sap/bc/adt/applicationlog/objects/source/formatter` | JSON Formatter                         |
| `/sap/bc/adt/applicationlog/objects/validation`       | Application Log Object Name Validation |

</details>

### /sap/bc/adt/aps (16 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                    | Title                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `/sap/bc/adt/aps/com/sod1`                                  | Open Discovery API Package                            |
| `/sap/bc/adt/aps/com/sod1/docuprogramobjtype/values`        | Type                                                  |
| `/sap/bc/adt/aps/com/sod1/packagetype/values`               | Type                                                  |
| `/sap/bc/adt/aps/com/sod1/tagcategory/values`               | Tag Categories                                        |
| `/sap/bc/adt/aps/com/sod1/tagvaluehelp/values`              | Tag Value Help                                        |
| `/sap/bc/adt/aps/com/sod1/validation`                       | Open Discovery API Package Name Validation            |
| `/sap/bc/adt/aps/com/sod2`                                  | Open Discovery API Package Assignment                 |
| `/sap/bc/adt/aps/com/sod2/apiobjecttype/values`             | API Object Types                                      |
| `/sap/bc/adt/aps/com/sod2/consumptionbundlename/values`     | Consumption Bundle Names                              |
| `/sap/bc/adt/aps/com/sod2/consumptionbundletype/values`     | Consumption Bundle Types                              |
| `/sap/bc/adt/aps/com/sod2/leadingbusinessobjecttype/values` | Leading Business Object Type                          |
| `/sap/bc/adt/aps/com/sod2/odatav4groupservice/values`       | Allowed OData V4 Services                             |
| `/sap/bc/adt/aps/com/sod2/tadir/values`                     | Allowed TADIR Values                                  |
| `/sap/bc/adt/aps/com/sod2/validation`                       | Open Discovery API Package Assignment Name Validation |
| `/sap/bc/adt/aps/common/sbc1`                               | Technical Object Group                                |
| `/sap/bc/adt/aps/common/sbc1/validation`                    | Technical Object Group Name Validation                |

</details>

### /sap/bc/adt/atc (23 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                 | Title                          |
| -------------------------------------------------------- | ------------------------------ |
| `/sap/bc/adt/atc/approvers`                              | List of Approvers              |
| `/sap/bc/adt/atc/autoqf/worklist`                        | Autoquickfix                   |
| `/sap/bc/adt/atc/ccstunnel`                              | CCS Tunnel                     |
| `/sap/bc/adt/atc/checkcategories`                        | Check Category                 |
| `/sap/bc/adt/atc/checkcategories/validation`             | Check Category Name Validation |
| `/sap/bc/adt/atc/checkexemptions`                        | Exemption                      |
| `/sap/bc/adt/atc/checkexemptions/validation`             | Exemption Name Validation      |
| `/sap/bc/adt/atc/checkexemptionsview`                    | Exemptions View                |
| `/sap/bc/adt/atc/checkfailures`                          | Check Failure                  |
| `/sap/bc/adt/atc/checkfailures/logs`                     | Check Failure Details          |
| `/sap/bc/adt/atc/checks`                                 | Check                          |
| `/sap/bc/adt/atc/checks/validation`                      | Check Name Validation          |
| `/sap/bc/adt/atc/checkvariants`                          | Check Variant                  |
| `/sap/bc/adt/atc/checkvariants/codecompletion/templates` | CHKV Templates                 |
| `/sap/bc/adt/atc/checkvariants/validation`               | Check Variant Name Validation  |
| `/sap/bc/adt/atc/configuration/configurations`           | ATC Configuration              |
| `/sap/bc/adt/atc/configuration/metadata`                 | ATC Configuration (Metadata)   |
| `/sap/bc/adt/atc/customizing`                            | ATC customizing                |
| `/sap/bc/adt/atc/exemptions/apply`                       | Exemptions Apply               |
| `/sap/bc/adt/atc/items`                                  | ATC Items                      |
| `/sap/bc/adt/atc/result/worklist`                        | Result Worklist                |
| `/sap/bc/adt/atc/runs`                                   | ATC runs                       |
| `/sap/bc/adt/atc/variants`                               | List of Variants               |

</details>

### /sap/bc/adt/ato (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                        | Title         |
| ------------------------------- | ------------- |
| `/sap/bc/adt/ato/notifications` | Notifications |
| `/sap/bc/adt/ato/settings`      | Settings      |

</details>

### /sap/bc/adt/aunit (3 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                | Title                   |
| ------------------------------------------------------- | ----------------------- |
| `/sap/bc/adt/aunit/dbtestdoubles/cds/dependencies`      | Get DDL Dependency      |
| `/sap/bc/adt/aunit/dbtestdoubles/cds/dependencies/info` | Get DDL dependency info |
| `/sap/bc/adt/aunit/dbtestdoubles/cds/validation`        | Validate DDL entity     |

</details>

### /sap/bc/adt/bct (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                   | Title                              |
| ------------------------------------------ | ---------------------------------- |
| `/sap/bc/adt/bct/smbctyp`                  | Maintenance Object                 |
| `/sap/bc/adt/bct/smbctyp/$configuration`   | JSON Configuration                 |
| `/sap/bc/adt/bct/smbctyp/$schema`          | JSON Schema                        |
| `/sap/bc/adt/bct/smbctyp/source/formatter` | JSON Formatter                     |
| `/sap/bc/adt/bct/smbctyp/validation`       | Maintenance Object Name Validation |

</details>

### /sap/bc/adt/bo (4 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                              | Title                           |
| ----------------------------------------------------- | ------------------------------- |
| `/sap/bc/adt/bo/behaviordefinitions`                  | Behavior Definition             |
| `/sap/bc/adt/bo/behaviordefinitions/parser/info`      | Behavior Definition Parser Info |
| `/sap/bc/adt/bo/behaviordefinitions/source/formatter` | Source Formatter                |
| `/sap/bc/adt/bo/behaviordefinitions/validation`       | Behavior Definition Validation  |

</details>

### /sap/bc/adt/bopf (8 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                            | Title                            |
| --------------------------------------------------- | -------------------------------- |
| `/sap/bc/adt/bopf/businessobjects`                  | Business Objects                 |
| `/sap/bc/adt/bopf/businessobjects/$constants`       | Interface constants              |
| `/sap/bc/adt/bopf/businessobjects/$contentassist`   | Contentassist                    |
| `/sap/bc/adt/bopf/businessobjects/$generation`      | Generation                       |
| `/sap/bc/adt/bopf/businessobjects/$search`          | Class Search                     |
| `/sap/bc/adt/bopf/businessobjects/$structurefields` | BO Node Structure Fields         |
| `/sap/bc/adt/bopf/businessobjects/$synchronize`     | Synchronize Behaviour Definition |
| `/sap/bc/adt/bopf/businessobjects/$validation`      | Validation                       |

</details>

### /sap/bc/adt/businesslogicextensions (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                | Title             |
| ------------------------------------------------------- | ----------------- |
| `/sap/bc/adt/businesslogicextensions/badinameproposals` | badinameproposals |
| `/sap/bc/adt/businesslogicextensions/badis`             | badis             |

</details>

### /sap/bc/adt/businessservices (36 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                           | Title                                     |
| ------------------------------------------------------------------ | ----------------------------------------- |
| `/sap/bc/adt/businessservices/bindings`                            | Service Binding                           |
| `/sap/bc/adt/businessservices/bindings/bindingtypes`               |                                           |
| `/sap/bc/adt/businessservices/bindings/bindingtypes/ina1`          |                                           |
| `/sap/bc/adt/businessservices/bindings/bindingtypes/sql1`          |                                           |
| `/sap/bc/adt/businessservices/bindings/schema`                     |                                           |
| `/sap/bc/adt/businessservices/bindings/uiconfig`                   |                                           |
| `/sap/bc/adt/businessservices/bindings/validate/servicedefinition` |                                           |
| `/sap/bc/adt/businessservices/bindings/validation`                 |                                           |
| `/sap/bc/adt/businessservices/consmodels`                          | Service Consumption Model                 |
| `/sap/bc/adt/businessservices/consmodels/codesample`               |                                           |
| `/sap/bc/adt/businessservices/consmodels/consdata/validate`        |                                           |
| `/sap/bc/adt/businessservices/consmodels/consumers`                |                                           |
| `/sap/bc/adt/businessservices/consmodels/validaterfc`              |                                           |
| `/sap/bc/adt/businessservices/consmodels/validatewsdl`             |                                           |
| `/sap/bc/adt/businessservices/consmodels/validation`               | Service Consumption Model Name Validation |
| `/sap/bc/adt/businessservices/eeecevc`                             | Event Consumption Model                   |
| `/sap/bc/adt/businessservices/eeecevc/$configuration`              | JSON Configuration                        |
| `/sap/bc/adt/businessservices/eeecevc/$schema`                     | JSON Schema                               |
| `/sap/bc/adt/businessservices/eeecevc/consumerdata`                |                                           |
| `/sap/bc/adt/businessservices/eeecevc/extractevtfile`              |                                           |
| `/sap/bc/adt/businessservices/eeecevc/generate`                    |                                           |
| `/sap/bc/adt/businessservices/eeecevc/previewobjects`              |                                           |
| `/sap/bc/adt/businessservices/eeecevc/source/formatter`            | JSON Formatter                            |
| `/sap/bc/adt/businessservices/eeecevc/validateartifact`            |                                           |
| `/sap/bc/adt/businessservices/eeecevc/validatemetadata`            |                                           |
| `/sap/bc/adt/businessservices/eeecevc/validation`                  | Event Consumption Model Name Validation   |
| `/sap/bc/adt/businessservices/evtbevb`                             | Event Binding                             |
| `/sap/bc/adt/businessservices/evtbevb/$configuration`              | JSON Configuration                        |
| `/sap/bc/adt/businessservices/evtbevb/$schema`                     | JSON Schema                               |
| `/sap/bc/adt/businessservices/evtbevb/source/formatter`            | JSON Formatter                            |
| `/sap/bc/adt/businessservices/evtbevb/validation`                  | Event Binding Name Validation             |
| `/sap/bc/adt/businessservices/evtbevv`                             | Event Version                             |
| `/sap/bc/adt/businessservices/evtbevv/validation`                  | Event Version Name Validation             |
| `/sap/bc/adt/businessservices/odatav2`                             | OData V2                                  |
| `/sap/bc/adt/businessservices/odatav4`                             | OData V4                                  |
| `/sap/bc/adt/businessservices/release`                             | Service Binding Classification            |

</details>

### /sap/bc/adt/changedocuments (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                               | Title                                  |
| ------------------------------------------------------ | -------------------------------------- |
| `/sap/bc/adt/changedocuments/objects`                  | Change Document Object                 |
| `/sap/bc/adt/changedocuments/objects/$configuration`   | JSON Configuration                     |
| `/sap/bc/adt/changedocuments/objects/$schema`          | JSON Schema                            |
| `/sap/bc/adt/changedocuments/objects/source/formatter` | JSON Formatter                         |
| `/sap/bc/adt/changedocuments/objects/validation`       | Change Document Object Name Validation |

</details>

### /sap/bc/adt/checkruns (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                          | Title     |
| --------------------------------- | --------- |
| `/sap/bc/adt/checkruns`           | Check     |
| `/sap/bc/adt/checkruns/reporters` | Reporters |

</details>

### /sap/bc/adt/classifications (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                      | Title           |
| ----------------------------- | --------------- |
| `/sap/bc/adt/classifications` | Classifications |

</details>

### /sap/bc/adt/cmp_code_composer (6 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                           | Title                                  |
| -------------------------------------------------- | -------------------------------------- |
| `/sap/bc/adt/cmp_code_composer/cmpt`               | Code Composer Template                 |
| `/sap/bc/adt/cmp_code_composer/cmpt/validation`    | Code Composer Template Name Validation |
| `/sap/bc/adt/cmp_code_composer/cmptare`            | Area                                   |
| `/sap/bc/adt/cmp_code_composer/cmptare/validation` | Area Name Validation                   |
| `/sap/bc/adt/cmp_code_composer/cmptfun`            | Function                               |
| `/sap/bc/adt/cmp_code_composer/cmptfun/validation` | Function Name Validation               |

</details>

### /sap/bc/adt/crosstrace (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                               | Title                           |
| -------------------------------------- | ------------------------------- |
| `/sap/bc/adt/crosstrace/activations`   | ABAP Cross Trace: Activations   |
| `/sap/bc/adt/crosstrace/components`    | ABAP Cross Trace: Components    |
| `/sap/bc/adt/crosstrace/request_types` | ABAP Cross Trace: Request Types |
| `/sap/bc/adt/crosstrace/traces`        | ABAP Cross Trace: Traces        |
| `/sap/bc/adt/crosstrace/urimapping`    | ABAP Cross Trace: URI Mapping   |

</details>

### /sap/bc/adt/cts (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                          | Title            |
| --------------------------------- | ---------------- |
| `/sap/bc/adt/cts/transportchecks` | Transport Checks |
| `/sap/bc/adt/cts/transports`      | Transports       |

</details>

### /sap/bc/adt/datapreview (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                               | Title                           |
| -------------------------------------- | ------------------------------- |
| `/sap/bc/adt/datapreview/amdp`         | Data Preview for AMDP           |
| `/sap/bc/adt/datapreview/amdpdebugger` | Data Preview for AMDP Debugger  |
| `/sap/bc/adt/datapreview/cds`          | Data Preview for CDS            |
| `/sap/bc/adt/datapreview/ddic`         | Modelled Data Preview for DDIC  |
| `/sap/bc/adt/datapreview/freestyle`    | Freestyle Data Preview for DDIC |

</details>

### /sap/bc/adt/dataproviders (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                    | Title                    |
| --------------------------- | ------------------------ |
| `/sap/bc/adt/dataproviders` | Data Provider Repository |

</details>

### /sap/bc/adt/ddic (93 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                          | Title                                            |
| ------------------------------------------------- | ------------------------------------------------ |
| `/sap/bc/adt/ddic/cds/annotation/definitions`     | CDS Annotation Definitions                       |
| `/sap/bc/adt/ddic/cds/annotation/elementinfo`     | Element Info for CDS Annotations                 |
| `/sap/bc/adt/ddic/codecompletion`                 | Code Completion Resource                         |
| `/sap/bc/adt/ddic/dataelements`                   | Data Element                                     |
| `/sap/bc/adt/ddic/dataelements/docu/status`       | Documentation Status                             |
| `/sap/bc/adt/ddic/dataelements/docu/supplements`  | Supplement Documentations                        |
| `/sap/bc/adt/ddic/dataelements/validation`        | Data Element Name Validation                     |
| `/sap/bc/adt/ddic/db/settings`                    | Technical Table Settings                         |
| `/sap/bc/adt/ddic/db/settings/dataClass/values`   | Data Class Category                              |
| `/sap/bc/adt/ddic/db/settings/keyFields/values`   | Key Area Fields                                  |
| `/sap/bc/adt/ddic/db/settings/size/values`        | Size Category                                    |
| `/sap/bc/adt/ddic/db/settings/validation`         | Technical Table Settings Name Validation         |
| `/sap/bc/adt/ddic/dbprocedureproxies`             | Database Procudre Proxies                        |
| `/sap/bc/adt/ddic/ddl/activeobject`               | DDL Active Object Resource                       |
| `/sap/bc/adt/ddic/ddl/createstatements`           | DDL sqlView Create Statement Resource            |
| `/sap/bc/adt/ddic/ddl/ddicrepositoryaccess`       | DDL Dictionary Repository Access Resource        |
| `/sap/bc/adt/ddic/ddl/dependencies/graphdata`     | DDL Dependency Analyzer Resource                 |
| `/sap/bc/adt/ddic/ddl/elementinfo`                | DDL Dictionary Element Info Resource             |
| `/sap/bc/adt/ddic/ddl/elementinfos`               | Dictionary Mass Element Info Resource            |
| `/sap/bc/adt/ddic/ddl/elementmappings`            | DDL Element Mapping Resource                     |
| `/sap/bc/adt/ddic/ddl/elementmappings/strategies` | DDL Element Mapping Strategies Resource          |
| `/sap/bc/adt/ddic/ddl/formatter/configurations`   | DDL pretty printer configuration                 |
| `/sap/bc/adt/ddic/ddl/formatter/identifiers`      | DDL Case Preserving Formatter for Identifiers    |
| `/sap/bc/adt/ddic/ddl/parser`                     | DDL Parser Information Resource                  |
| `/sap/bc/adt/ddic/ddl/relatedObjects`             | Related Objects Resource                         |
| `/sap/bc/adt/ddic/ddl/sources`                    | DDL Sources                                      |
| `/sap/bc/adt/ddic/ddl/validation`                 | DDL Sources Validation                           |
| `/sap/bc/adt/ddic/ddla/formatter/identifiers`     | DDLA Case Preserving Formatter for Identifiers   |
| `/sap/bc/adt/ddic/ddla/parser/info`               | DDLA Parser Info Resource                        |
| `/sap/bc/adt/ddic/ddla/repositoryaccess`          | DDLA Dictionary Repository Access Resource       |
| `/sap/bc/adt/ddic/ddla/sources`                   | Annotation Definition                            |
| `/sap/bc/adt/ddic/ddla/sources/validation`        | Annotation Definition Name Validation            |
| `/sap/bc/adt/ddic/ddla/textlengthcalc`            | DDLA Text Length Calculator                      |
| `/sap/bc/adt/ddic/ddlx/annotation/chain`          | Annotation chain resource                        |
| `/sap/bc/adt/ddic/ddlx/formatter/identifiers`     | DDLX Case Preserving Formatter for Identifiers   |
| `/sap/bc/adt/ddic/ddlx/parser/info`               | DDLX Parser Info Resource                        |
| `/sap/bc/adt/ddic/ddlx/sources`                   | Metadata Extension                               |
| `/sap/bc/adt/ddic/ddlx/sources/validation`        | Metadata Extension Name Validation               |
| `/sap/bc/adt/ddic/domains`                        | Domain                                           |
| `/sap/bc/adt/ddic/domains/validation`             | Domain Name Validation                           |
| `/sap/bc/adt/ddic/drty/sources`                   | Type                                             |
| `/sap/bc/adt/ddic/drty/sources/$navigation`       | drty navigation support                          |
| `/sap/bc/adt/ddic/drty/sources/validation`        | Type Name Validation                             |
| `/sap/bc/adt/ddic/drul/parser/info`               | DRUL Parser Info Resource                        |
| `/sap/bc/adt/ddic/drul/sources`                   | Dependency Rule                                  |
| `/sap/bc/adt/ddic/drul/sources/validation`        | Dependency Rule Name Validation                  |
| `/sap/bc/adt/ddic/dsfd/sources`                   | Scalar Function                                  |
| `/sap/bc/adt/ddic/dsfd/sources/$navigation`       | dsfd navigation support                          |
| `/sap/bc/adt/ddic/dsfd/sources/validation`        | Scalar Function Name Validation                  |
| `/sap/bc/adt/ddic/dsfi`                           | Scalar Function Implementation                   |
| `/sap/bc/adt/ddic/dsfi/$configuration`            | JSON Configuration                               |
| `/sap/bc/adt/ddic/dsfi/$schema`                   | JSON Schema                                      |
| `/sap/bc/adt/ddic/dsfi/source/formatter`          | JSON Formatter                                   |
| `/sap/bc/adt/ddic/dsfi/validation`                | Scalar Function Implementation Name Validation   |
| `/sap/bc/adt/ddic/dtdc/createstatements`          | Dynamic View Cache Create SQL Statement Resource |
| `/sap/bc/adt/ddic/dtdc/parser/info`               | Dynamic View Cache Parser Info Resource          |
| `/sap/bc/adt/ddic/dtdc/sources`                   | Dynamic Cache                                    |
| `/sap/bc/adt/ddic/dtdc/sources/validation`        | Dynamic Cache Name Validation                    |
| `/sap/bc/adt/ddic/dteb/codecompletion/proposal`   | Entity Buffer Code Completion                    |
| `/sap/bc/adt/ddic/dteb/elementinfo`               | Entity Buffer Element Info                       |
| `/sap/bc/adt/ddic/dteb/formatter`                 | Entity Buffer Formatter                          |
| `/sap/bc/adt/ddic/dteb/navigation`                | Entity Buffer Navigation Support                 |
| `/sap/bc/adt/ddic/dteb/parser/info`               | Entity Buffer Parser Info Resource               |
| `/sap/bc/adt/ddic/dteb/sources`                   | Entity Buffer                                    |
| `/sap/bc/adt/ddic/dteb/sources/validation`        | Entity Buffer Name Validation                    |
| `/sap/bc/adt/ddic/elementinfo`                    | Element Info Resource                            |
| `/sap/bc/adt/ddic/lockobjects/adjustment`         | ENQU Lock Object Adjustment                      |
| `/sap/bc/adt/ddic/lockobjects/lockmodes`          | ENQU Lock Mode Named Items                       |
| `/sap/bc/adt/ddic/lockobjects/sources`            | Lock Object                                      |
| `/sap/bc/adt/ddic/lockobjects/sources/validation` | Lock Object Name Validation                      |
| `/sap/bc/adt/ddic/lockobjects/tables`             | ENQU Secondary Table Proposals                   |
| `/sap/bc/adt/ddic/lockobjects/validation`         | ENQU Lock Object Validation                      |
| `/sap/bc/adt/ddic/logs/activationgraph`           | DDIC Activation Graph Resource                   |
| `/sap/bc/adt/ddic/srvd/elementinfo`               | Service Definition Element Info Resource         |
| `/sap/bc/adt/ddic/srvd/formatter/identifiers`     | SRVD Case Preserving Formatter for Identifiers   |
| `/sap/bc/adt/ddic/srvd/parser/info`               | SRVD Parser Info Resource                        |
| `/sap/bc/adt/ddic/srvd/services`                  | SRVD Services                                    |
| `/sap/bc/adt/ddic/srvd/sources`                   | Service Definition                               |
| `/sap/bc/adt/ddic/srvd/sources/validation`        | Service Definition Name Validation               |
| `/sap/bc/adt/ddic/srvd/sourceTypes`               | SRVD Source Types                                |
| `/sap/bc/adt/ddic/structures`                     | Structure                                        |
| `/sap/bc/adt/ddic/structures/parser/info`         | Structure Parser Info                            |
| `/sap/bc/adt/ddic/structures/validation`          | Structure Name Validation                        |
| `/sap/bc/adt/ddic/tables`                         | Database Table                                   |
| `/sap/bc/adt/ddic/tables/parser/info`             | Table Parser Info                                |
| `/sap/bc/adt/ddic/tables/validation`              | Database Table Name Validation                   |
| `/sap/bc/adt/ddic/tabletypes`                     | Table Type                                       |
| `/sap/bc/adt/ddic/tabletypes/validation`          | Table Type Name Validation                       |
| `/sap/bc/adt/ddic/typegroups`                     | TypeGroups                                       |
| `/sap/bc/adt/ddic/typegroups/validation`          | Validation                                       |
| `/sap/bc/adt/ddic/validation`                     | DDIC SQSC Validation                             |
| `/sap/bc/adt/ddic/views`                          | Views                                            |
| `/sap/bc/adt/ddic/views/$validation`              | View Validation                                  |

</details>

### /sap/bc/adt/debugger (14 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                        | Title                         |
| ----------------------------------------------- | ----------------------------- |
| `/sap/bc/adt/debugger`                          | Debugger                      |
| `/sap/bc/adt/debugger/actions`                  | Debugger Actions              |
| `/sap/bc/adt/debugger/batch`                    | Debugger Batch Request        |
| `/sap/bc/adt/debugger/breakpoints`              | Breakpoints                   |
| `/sap/bc/adt/debugger/breakpoints/conditions`   | Breakpoint Condition          |
| `/sap/bc/adt/debugger/breakpoints/messagetypes` | Message Types for Breakpoints |
| `/sap/bc/adt/debugger/breakpoints/statements`   | Statements for Breakpoints    |
| `/sap/bc/adt/debugger/breakpoints/validations`  | Breakpoint Validation         |
| `/sap/bc/adt/debugger/breakpoints/vit`          | VIT Breakpoints               |
| `/sap/bc/adt/debugger/listeners`                | Debugger Listeners            |
| `/sap/bc/adt/debugger/stack`                    | Debugger Stack                |
| `/sap/bc/adt/debugger/systemareas`              | System Areas                  |
| `/sap/bc/adt/debugger/variables`                | Debugger Variables            |
| `/sap/bc/adt/debugger/watchpoints`              | Debugger Watchpoints          |

</details>

### /sap/bc/adt/deletion (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                      | Title          |
| ----------------------------- | -------------- |
| `/sap/bc/adt/deletion/check`  | Deletion check |
| `/sap/bc/adt/deletion/delete` | Deletion       |

</details>

### /sap/bc/adt/development (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                      | Title                    |
| --------------------------------------------- | ------------------------ |
| `/sap/bc/adt/development/handler/adtresource` | ADT Resource             |
| `/sap/bc/adt/development/handler/application` | ADT Resource Application |

</details>

### /sap/bc/adt/dlp (3 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                       | Title                                   |
| ------------------------------ | --------------------------------------- |
| `/sap/bc/adt/dlp/locationinfo` | Locations where logpoints are creatable |
| `/sap/bc/adt/dlp/logpoints`    | Dynamic Logpoints                       |
| `/sap/bc/adt/dlp/logs/servers` | Transfer logpoint logs to database      |

</details>

### /sap/bc/adt/docu (9 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                      | Title                                |
| ----------------------------- | ------------------------------------ |
| `/sap/bc/adt/docu/abap/langu` | ABAP Language Help                   |
| `/sap/bc/adt/docu/dcl/langu`  | DCL Language Help Resource           |
| `/sap/bc/adt/docu/ddl/langu`  | DDL Language Help Resource           |
| `/sap/bc/adt/docu/ddla/langu` | DDLA Language Help Resource          |
| `/sap/bc/adt/docu/ddlx/langu` | DDLX Language Help Resource          |
| `/sap/bc/adt/docu/drul/langu` | DRUL Language Help Resource          |
| `/sap/bc/adt/docu/dtdc/langu` | DTDC Language Help Resource          |
| `/sap/bc/adt/docu/dteb/langu` | Entity Buffer Language Help Resource |
| `/sap/bc/adt/docu/srvd/langu` | SRVD Language Help Resource          |

</details>

### /sap/bc/adt/documentation (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                           | Title                       |
| ------------------------------------------------------------------ | --------------------------- |
| `/sap/bc/adt/documentation/ktd/documents`                          | Knowledge Transfer Document |
| `/sap/bc/adt/documentation/ktd/documents/codecompletion/links`     | KTD Link Code Completion    |
| `/sap/bc/adt/documentation/ktd/documents/codecompletion/templates` | KTD Syntax Templates        |
| `/sap/bc/adt/documentation/ktd/documents/preview`                  | Dita Document Preview       |
| `/sap/bc/adt/documentation/ktd/documents/validation`               | KTD Document Validation     |

</details>

### /sap/bc/adt/dummygroup (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                      | Title                                              |
| --------------------------------------------- | -------------------------------------------------- |
| `/sap/bc/adt/dummygroup/wbttt1a`              | Dummy 1A object type                               |
| `/sap/bc/adt/dummygroup/wbttt1a/validation`   | Dummy 1A object type Name Validation               |
| `/sap/bc/adt/dummygroup/wbttt1a/white/yellow` | green description                                  |
| `/sap/bc/adt/dummygroup/wbttt2a`              | Dummy object type (for unit tests)                 |
| `/sap/bc/adt/dummygroup/wbttt2a/validation`   | Dummy object type (for unit tests) Name Validation |

</details>

### /sap/bc/adt/enhancements (11 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                      | Title                                      |
| --------------------------------------------- | ------------------------------------------ |
| `/sap/bc/adt/enhancements/enhoxh`             | Enhancement Implementation                 |
| `/sap/bc/adt/enhancements/enhoxh/validation`  | Enhancement Implementation Name Validation |
| `/sap/bc/adt/enhancements/enhoxhb`            | BAdI Implementation                        |
| `/sap/bc/adt/enhancements/enhoxhb/validation` | BAdI Implementation Name Validation        |
| `/sap/bc/adt/enhancements/enhoxhh`            | Source Code Plugin                         |
| `/sap/bc/adt/enhancements/enhoxhh/validation` | Object Name Validation                     |
| `/sap/bc/adt/enhancements/enhsxs`             | Enhancement Spot                           |
| `/sap/bc/adt/enhancements/enhsxs/validation`  | Enhancement Spot Name Validation           |
| `/sap/bc/adt/enhancements/enhsxsb`            | BAdI Enhancement Spot                      |
| `/sap/bc/adt/enhancements/enhsxsb/search`     | Enhancement Spot Search                    |
| `/sap/bc/adt/enhancements/enhsxsb/validation` | BAdI Definition Validation                 |

</details>

### /sap/bc/adt/feeds (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                     | Title           |
| ---------------------------- | --------------- |
| `/sap/bc/adt/feeds`          | Feed Repository |
| `/sap/bc/adt/feeds/variants` | Feed Variants   |

</details>

### /sap/bc/adt/filestore (3 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                       | Title                                              |
| ---------------------------------------------- | -------------------------------------------------- |
| `/sap/bc/adt/filestore/ui5-bsp/deploy-storage` | SAPUI5 Filestore Marker for Deploy storage support |
| `/sap/bc/adt/filestore/ui5-bsp/objects`        | SAPUI5 Filestore based on BSP                      |
| `/sap/bc/adt/filestore/ui5-bsp/ui5-rt-version` | SAPUI5 Runtime Version                             |

</details>

### /sap/bc/adt/fpm (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                        | Title                           |
| ------------------------------- | ------------------------------- |
| `/sap/bc/adt/fpm/creationtools` | FPM Applications Creation Tools |

</details>

### /sap/bc/adt/functions (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                           | Title                     |
| ---------------------------------- | ------------------------- |
| `/sap/bc/adt/functions/groups`     | Function Groups           |
| `/sap/bc/adt/functions/validation` | Function Group Validation |

</details>

### /sap/bc/adt/hota (12 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                           | Title                                      |
| -------------------------------------------------- | ------------------------------------------ |
| `/sap/bc/adt/hota/hotahdi`                         | Namespace in HDI container                 |
| `/sap/bc/adt/hota/hotahdi/hota/checknamespace`     |                                            |
| `/sap/bc/adt/hota/hotahdi/hota/checkout/hdiwizard` |                                            |
| `/sap/bc/adt/hota/hotahdi/hota/containername`      |                                            |
| `/sap/bc/adt/hota/hotahdi/hota/featurecheck`       |                                            |
| `/sap/bc/adt/hota/hotahdi/hoto/addlprops`          |                                            |
| `/sap/bc/adt/hota/hotahdi/hoto/checkin`            |                                            |
| `/sap/bc/adt/hota/hotahdi/hoto/checkout`           |                                            |
| `/sap/bc/adt/hota/hotahdi/hoto/transportdetails`   |                                            |
| `/sap/bc/adt/hota/hotahdi/validation`              | Namespace in HDI container Name Validation |
| `/sap/bc/adt/hota/hotahto`                         | HDI Artifact                               |
| `/sap/bc/adt/hota/hotahto/validation`              | HDI Artifact Name Validation               |

</details>

### /sap/bc/adt/includes (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                          | Title              |
| --------------------------------- | ------------------ |
| `/sap/bc/adt/includes/validation` | Include Validation |

</details>

### /sap/bc/adt/lifecycle_management (3 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                       | Title                                               |
| -------------------------------------------------------------- | --------------------------------------------------- |
| `/sap/bc/adt/lifecycle_management/ftglaf`                      | Feature Toggle                                      |
| `/sap/bc/adt/lifecycle_management/ftglaf/releasestatus/values` | Allowed values for Release Status of Feature Toggle |
| `/sap/bc/adt/lifecycle_management/ftglaf/validation`           | Feature Toggle Name Validation                      |

</details>

### /sap/bc/adt/messageclass (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                              | Title                            |
| ------------------------------------- | -------------------------------- |
| `/sap/bc/adt/messageclass`            | Message Classes                  |
| `/sap/bc/adt/messageclass/validation` | Validation of Message class Name |

</details>

### /sap/bc/adt/navigation (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                             | Title             |
| ------------------------------------ | ----------------- |
| `/sap/bc/adt/navigation/indexupdate` | Navigation Update |
| `/sap/bc/adt/navigation/target`      | Navigation        |

</details>

### /sap/bc/adt/nhi (6 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                              | Title                                     |
| ------------------------------------- | ----------------------------------------- |
| `/sap/bc/adt/nhi/dbprocedures`        | Database Procedures for HANA-Integration  |
| `/sap/bc/adt/nhi/deliveryunitproxies` | Deliveryunit-Proxies for HANA-Integration |
| `/sap/bc/adt/nhi/deliveryunits`       | Deliveryunits for HANA-Integration        |
| `/sap/bc/adt/nhi/validation`          | Validation for HANA-Integration           |
| `/sap/bc/adt/nhi/vendors`             | Vendors for HANA-Integration              |
| `/sap/bc/adt/nhi/views`               | Views for HANA-Integration                |

</details>

### /sap/bc/adt/numberranges (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                            | Title                               |
| --------------------------------------------------- | ----------------------------------- |
| `/sap/bc/adt/numberranges/objects`                  | Number Range Object                 |
| `/sap/bc/adt/numberranges/objects/$configuration`   | JSON Configuration                  |
| `/sap/bc/adt/numberranges/objects/$schema`          | JSON Schema                         |
| `/sap/bc/adt/numberranges/objects/source/formatter` | JSON Formatter                      |
| `/sap/bc/adt/numberranges/objects/validation`       | Number Range Object Name Validation |

</details>

### /sap/bc/adt/objectrelations (3 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                 | Title                         |
| ---------------------------------------- | ----------------------------- |
| `/sap/bc/adt/objectrelations/components` | Object relations              |
| `/sap/bc/adt/objectrelations/network`    | Object relations              |
| `/sap/bc/adt/objectrelations/references` | References in Object Relation |

</details>

### /sap/bc/adt/objtype_admin (9 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                          | Title                                           |
| ------------------------------------------------- | ----------------------------------------------- |
| `/sap/bc/adt/objtype_admin/sval`                  | Repository Object Type                          |
| `/sap/bc/adt/objtype_admin/sval/assist/trscopes`  | Available TR functional usage areas             |
| `/sap/bc/adt/objtype_admin/sval/assist/wbobjlist` | Available options for visibility in object list |
| `/sap/bc/adt/objtype_admin/sval/assist/wbscopes`  | Available WB functional usage areas             |
| `/sap/bc/adt/objtype_admin/sval/configurations`   | Blue Tool Configurations                        |
| `/sap/bc/adt/objtype_admin/sval/metadata`         | Blue Tool Configurations (Metadata)             |
| `/sap/bc/adt/objtype_admin/sval/validation`       | Repository Object Type Name Validation          |
| `/sap/bc/adt/objtype_admin/wgrp`                  | Object Type Group                               |
| `/sap/bc/adt/objtype_admin/wgrp/validation`       | Object Type Group Name Validation               |

</details>

### /sap/bc/adt/oo (4 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                               | Title                     |
| -------------------------------------- | ------------------------- |
| `/sap/bc/adt/oo/classes`               | Classes                   |
| `/sap/bc/adt/oo/classrun`              | Run a class               |
| `/sap/bc/adt/oo/interfaces`            | Interfaces                |
| `/sap/bc/adt/oo/validation/objectname` | Validation of Object Name |

</details>

### /sap/bc/adt/other (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                            | Title                           |
| ----------------------------------- | ------------------------------- |
| `/sap/bc/adt/other/gsmp`            | Metric Provider                 |
| `/sap/bc/adt/other/gsmp/validation` | Metric Provider Name Validation |

</details>

### /sap/bc/adt/predefinedfields (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                | Title                                     |
| ------------------------------------------------------- | ----------------------------------------- |
| `/sap/bc/adt/predefinedfields/objects`                  | Predefined Field Enabling                 |
| `/sap/bc/adt/predefinedfields/objects/$configuration`   | JSON Configuration                        |
| `/sap/bc/adt/predefinedfields/objects/$schema`          | JSON Schema                               |
| `/sap/bc/adt/predefinedfields/objects/source/formatter` | JSON Formatter                            |
| `/sap/bc/adt/predefinedfields/objects/validation`       | Predefined Field Enabling Name Validation |

</details>

### /sap/bc/adt/programs (4 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                          | Title              |
| --------------------------------- | ------------------ |
| `/sap/bc/adt/programs/includes`   | Includes           |
| `/sap/bc/adt/programs/programrun` | Run a program      |
| `/sap/bc/adt/programs/programs`   | Programs           |
| `/sap/bc/adt/programs/validation` | Program Validation |

</details>

### /sap/bc/adt/quickfixes (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                            | Title      |
| ----------------------------------- | ---------- |
| `/sap/bc/adt/quickfixes/evaluation` | Quickfixes |

</details>

### /sap/bc/adt/refactoring (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                | Title                     |
| --------------------------------------- | ------------------------- |
| `/sap/bc/adt/refactoring/changepackage` | Change Package Assignment |

</details>

### /sap/bc/adt/refactorings (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                   | Title       |
| -------------------------- | ----------- |
| `/sap/bc/adt/refactorings` | Refactoring |

</details>

### /sap/bc/adt/reportdefinitions (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                        | Title                                 |
| ----------------------------------------------- | ------------------------------------- |
| `/sap/bc/adt/reportdefinitions/srfr`            | SRF Report Definition                 |
| `/sap/bc/adt/reportdefinitions/srfr/validation` | SRF Report Definition Name Validation |

</details>

### /sap/bc/adt/repository (28 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                               | Title                                  |
| ---------------------------------------------------------------------- | -------------------------------------- |
| `/sap/bc/adt/repository/favorites/lists`                               | Object Favorites                       |
| `/sap/bc/adt/repository/generators`                                    | Repository Objects Generators          |
| `/sap/bc/adt/repository/informationsystem/abaplanguageversions`        | ABAP Language Versions                 |
| `/sap/bc/adt/repository/informationsystem/ci/forecast/rfcdestinations` | Integration Forecast: RFC Destinations |
| `/sap/bc/adt/repository/informationsystem/ci/forecast/run`             | Integration Forecast                   |
| `/sap/bc/adt/repository/informationsystem/elementinfo`                 | Element Info                           |
| `/sap/bc/adt/repository/informationsystem/executableObjects`           | Executable Objects                     |
| `/sap/bc/adt/repository/informationsystem/executableobjecttypes`       | Executable Object Types                |
| `/sap/bc/adt/repository/informationsystem/fullnamemapping`             | Full Name Mapping                      |
| `/sap/bc/adt/repository/informationsystem/messagesearch`               | Message Search                         |
| `/sap/bc/adt/repository/informationsystem/metadata`                    | Meta Data                              |
| `/sap/bc/adt/repository/informationsystem/objectproperties/transports` | Transport Properties                   |
| `/sap/bc/adt/repository/informationsystem/objectproperties/values`     | Object Properties                      |
| `/sap/bc/adt/repository/informationsystem/objecttypes`                 | Object Types                           |
| `/sap/bc/adt/repository/informationsystem/properties/values`           | Property Values                        |
| `/sap/bc/adt/repository/informationsystem/releasestates`               | Release States                         |
| `/sap/bc/adt/repository/informationsystem/search`                      | Search                                 |
| `/sap/bc/adt/repository/informationsystem/usageReferences`             | Usage References                       |
| `/sap/bc/adt/repository/informationsystem/usageSnippets`               | Usage Snippets                         |
| `/sap/bc/adt/repository/informationsystem/virtualfolders`              | Virtual Folders                        |
| `/sap/bc/adt/repository/informationsystem/virtualfolders/contents`     | Virtual Folders Contents               |
| `/sap/bc/adt/repository/informationsystem/virtualfolders/facets`       | Facets supported by Virtual Folders    |
| `/sap/bc/adt/repository/informationsystem/whereused`                   | Where Used                             |
| `/sap/bc/adt/repository/nodepath`                                      | Node Path                              |
| `/sap/bc/adt/repository/nodestructure`                                 | Node Structure                         |
| `/sap/bc/adt/repository/objectstructure`                               | Object Structure                       |
| `/sap/bc/adt/repository/proxyurimappings`                              | Proxy URI Mappings                     |
| `/sap/bc/adt/repository/typestructure`                                 | Type Structure                         |

</details>

### /sap/bc/adt/runtime (9 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                             | Title                                      |
| ---------------------------------------------------- | ------------------------------------------ |
| `/sap/bc/adt/runtime/traces/abaptraces`              | Trace files                                |
| `/sap/bc/adt/runtime/traces/abaptraces/objecttypes`  | List of object types                       |
| `/sap/bc/adt/runtime/traces/abaptraces/parameters`   | Trace parameters                           |
| `/sap/bc/adt/runtime/traces/abaptraces/parameters`   | Trace parameters for callstack aggregation |
| `/sap/bc/adt/runtime/traces/abaptraces/parameters`   | Trace parameters for amdp trace            |
| `/sap/bc/adt/runtime/traces/abaptraces/processtypes` | List of process types                      |
| `/sap/bc/adt/runtime/traces/abaptraces/requests`     | Trace requests                             |
| `/sap/bc/adt/runtime/traces/abaptraces/requests`     | Trace requests with uri                    |
| `/sap/bc/adt/runtime/workprocesses`                  | Work Processes                             |

</details>

### /sap/bc/adt/sadl (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                | Title                                         |
| --------------------------------------- | --------------------------------------------- |
| `/sap/bc/adt/sadl/gw/annopush/finalize` | SADL: Annotation Pushdown Finalize            |
| `/sap/bc/adt/sadl/gw/annopush/prepare`  | SADL: Annotation Pushdown Prepare             |
| `/sap/bc/adt/sadl/gw/annopush/push`     | SADL: Annotation Pushdown Push                |
| `/sap/bc/adt/sadl/gw/annopush/validate` | SADL: Annotation Pushdown Validate            |
| `/sap/bc/adt/sadl/gw/mde`               | SADL: Annotation Pushdown Metadata Extentions |

</details>

### /sap/bc/adt/schema_definitions (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                            | Title                                   |
| --------------------------------------------------- | --------------------------------------- |
| `/sap/bc/adt/schema_definitions/amsdtyp`            | Logical Database Schema                 |
| `/sap/bc/adt/schema_definitions/amsdtyp/validation` | Logical Database Schema Name Validation |

</details>

### /sap/bc/adt/security (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                | Title                     |
| --------------------------------------- | ------------------------- |
| `/sap/bc/adt/security/reentranceticket` | Security Reentranceticket |

</details>

### /sap/bc/adt/sqlm (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                | Title           |
| ----------------------- | --------------- |
| `/sap/bc/adt/sqlm/data` | SQLM Data Fetch |

</details>

### /sap/bc/adt/st05 (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                           | Title                        |
| ---------------------------------- | ---------------------------- |
| `/sap/bc/adt/st05/trace/directory` | Performance Trace Drirectory |
| `/sap/bc/adt/st05/trace/state`     | Performance Trace State      |

</details>

### /sap/bc/adt/system (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                               | Title                |
| -------------------------------------- | -------------------- |
| `/sap/bc/adt/system/clients`           | Client               |
| `/sap/bc/adt/system/components`        | Installed Components |
| `/sap/bc/adt/system/information`       | System Information   |
| `/sap/bc/adt/system/landscape/servers` | System Landscape     |
| `/sap/bc/adt/system/users`             | User                 |

</details>

### /sap/bc/adt/testcodegen (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                          | Title                     |
| ------------------------------------------------- | ------------------------- |
| `/sap/bc/adt/testcodegen/dependencies/doubledata` | Get DDL Dependency        |
| `/sap/bc/adt/testcodegen/dependencies/doubledata` | Generate TestCode for CDS |

</details>

### /sap/bc/adt/textelements (3 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                  | Title         |
| ----------------------------------------- | ------------- |
| `/sap/bc/adt/textelements/classes`        | Text Elements |
| `/sap/bc/adt/textelements/functiongroups` | Text Elements |
| `/sap/bc/adt/textelements/programs`       | Text Elements |

</details>

### /sap/bc/adt/uc_object_type_group (17 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                       | Title                                         |
| -------------------------------------------------------------- | --------------------------------------------- |
| `/sap/bc/adt/uc_object_type_group/samc`                        | ABAP Messaging Channel                        |
| `/sap/bc/adt/uc_object_type_group/samc/activity/values`        | AMC Activity                                  |
| `/sap/bc/adt/uc_object_type_group/samc/messagetype/values`     | AMC Message Type                              |
| `/sap/bc/adt/uc_object_type_group/samc/progtype/values`        | AMC Program Type                              |
| `/sap/bc/adt/uc_object_type_group/samc/scope/values`           | AMC Scope                                     |
| `/sap/bc/adt/uc_object_type_group/samc/validation`             | ABAP Messaging Channel Name Validation        |
| `/sap/bc/adt/uc_object_type_group/samc/virusscan/values`       | AMC Virus Scan Outgoing                       |
| `/sap/bc/adt/uc_object_type_group/sapc`                        | ABAP Push Channel Application                 |
| `/sap/bc/adt/uc_object_type_group/sapc/classproperties/values` | APC Superclass determination                  |
| `/sap/bc/adt/uc_object_type_group/sapc/connectiontypes/values` | APC Connection Type                           |
| `/sap/bc/adt/uc_object_type_group/sapc/protocoltypes/values`   | APC Protocol Type                             |
| `/sap/bc/adt/uc_object_type_group/sapc/service_path/values`    | Exist Service Pfad                            |
| `/sap/bc/adt/uc_object_type_group/sapc/superclass/values`      | APC Superclass determination                  |
| `/sap/bc/adt/uc_object_type_group/sapc/testurl/values`         | URL for Testscenario                          |
| `/sap/bc/adt/uc_object_type_group/sapc/validation`             | ABAP Push Channel Application Name Validation |
| `/sap/bc/adt/uc_object_type_group/sapc/virusscanin/values`     | APC Virus Scan Ingoing                        |
| `/sap/bc/adt/uc_object_type_group/sapc/virusscanout/values`    | APC Virus Scan Outgoing                       |

</details>

### /sap/bc/adt/ucon (3 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                          | Title                  |
| ------------------------------------------------- | ---------------------- |
| `/sap/bc/adt/ucon/httpservices`                   | HTTP Service           |
| `/sap/bc/adt/ucon/httpservices/HandlerClassesUri` | Handlerclasses search  |
| `/sap/bc/adt/ucon/httpservices/validation`        | Object Name Validation |

</details>

### /sap/bc/adt/ui_flex_dta_folder (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                          | Title                           |
| --------------------------------- | ------------------------------- |
| `/sap/bc/adt/ui_flex_dta_folder/` | Designtime adapation deployment |

</details>

### /sap/bc/adt/urifragmentmappings (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                          | Title               |
| --------------------------------- | ------------------- |
| `/sap/bc/adt/urifragmentmappings` | URI Fragment Mapper |

</details>

### /sap/bc/adt/vit (2 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                         | Title                   |
| -------------------------------- | ----------------------- |
| `/sap/bc/adt/vit/urimapper`      | VIT URI Mapper          |
| `/sap/bc/adt/vit/wb/object_type` | Basic Object Properties |

</details>

### /sap/bc/adt/wbobj (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                     | Title                       |
| -------------------------------------------- | --------------------------- |
| `/sap/bc/adt/wbobj/apictyp`                  | API Catalog                 |
| `/sap/bc/adt/wbobj/apictyp/$configuration`   | JSON Configuration          |
| `/sap/bc/adt/wbobj/apictyp/$schema`          | JSON Schema                 |
| `/sap/bc/adt/wbobj/apictyp/source/formatter` | JSON Formatter              |
| `/sap/bc/adt/wbobj/apictyp/validation`       | API Catalog Name Validation |

</details>

### /sap/bc/adt/wdy (27 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                                | Title                                               |
| ------------------------------------------------------- | --------------------------------------------------- |
| `/sap/bc/adt/wdy/abapsource/codecompletion/elementinfo` | Webdynpro element information                       |
| `/sap/bc/adt/wdy/abapsource/codecompletion/insertion`   | Webdynpro element insertion                         |
| `/sap/bc/adt/wdy/abapsource/codecompletion/proposal`    | Webdynpro Code Completion                           |
| `/sap/bc/adt/wdy/abapsource/prettyprinter`              | Webdynpro Pretty Printer                            |
| `/sap/bc/adt/wdy/applicationconfig`                     | Application Configuration                           |
| `/sap/bc/adt/wdy/applications`                          | WebDynpro Application                               |
| `/sap/bc/adt/wdy/codetemplate`                          | Code template                                       |
| `/sap/bc/adt/wdy/componentconfig`                       | Web Dynpro Configuration                            |
| `/sap/bc/adt/wdy/componentcontrollers`                  | Component Controller                                |
| `/sap/bc/adt/wdy/componentinterfaces`                   | WebDynpro ComponentInterface                        |
| `/sap/bc/adt/wdy/components`                            | WebDynpro Component                                 |
| `/sap/bc/adt/wdy/customcontrollers`                     | Custom Controller                                   |
| `/sap/bc/adt/wdy/fpmadaptables`                         | FPM Adaptable Configuration                         |
| `/sap/bc/adt/wdy/fpmapplications`                       | FPM Application Configuration                       |
| `/sap/bc/adt/wdy/fpmcomponents`                         | FPM Layout Component Configuration                  |
| `/sap/bc/adt/wdy/fpmfloorplans`                         | FPM Flooplan Configuration                          |
| `/sap/bc/adt/wdy/fpmguibbs`                             | FPM Adaptable Configuration                         |
| `/sap/bc/adt/wdy/fpmruibbs`                             | FPM Adaptable Configuration                         |
| `/sap/bc/adt/wdy/interfacecontrollers`                  | Interface Controller                                |
| `/sap/bc/adt/wdy/interfaceviews`                        | WebDynpro Interface View                            |
| `/sap/bc/adt/wdy/interfaceviews`                        | Interface view Controller for a Component Interface |
| `/sap/bc/adt/wdy/launchconfiguration`                   | Web Dynpro Application launcher                     |
| `/sap/bc/adt/wdy/navigation/target`                     | Navigation controller                               |
| `/sap/bc/adt/wdy/search`                                | Search WDA Entities                                 |
| `/sap/bc/adt/wdy/viewdesigner/uielementlibrary`         | Webdynpro View UI Element Library                   |
| `/sap/bc/adt/wdy/views`                                 | Webdynpro View                                      |
| `/sap/bc/adt/wdy/windows`                               | Window Controller                                   |

</details>

### /sap/bc/adt/wmpc (5 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                         | Title                            |
| ------------------------------------------------ | -------------------------------- |
| `/sap/bc/adt/wmpc/applications`                  | WMPC Application                 |
| `/sap/bc/adt/wmpc/applications/$configuration`   | JSON Configuration               |
| `/sap/bc/adt/wmpc/applications/$schema`          | JSON Schema                      |
| `/sap/bc/adt/wmpc/applications/source/formatter` | JSON Formatter                   |
| `/sap/bc/adt/wmpc/applications/validation`       | WMPC Application Name Validation |

</details>

### /sap/bc/adt/xslt (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                           | Title          |
| ---------------------------------- | -------------- |
| `/sap/bc/adt/xslt/transformations` | Transformation |

</details>

### /sap/bc/esproxy/activation (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                     | Title            |
| ---------------------------- | ---------------- |
| `/sap/bc/esproxy/activation` | Proxy Activation |

</details>

### /sap/bc/esproxy/consumerfactories (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                            | Title            |
| ----------------------------------- | ---------------- |
| `/sap/bc/esproxy/consumerfactories` | Consumer Factory |

</details>

### /sap/bc/esproxy/consumermappings (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                           | Title            |
| ---------------------------------- | ---------------- |
| `/sap/bc/esproxy/consumermappings` | Consumer Mapping |

</details>

### /sap/bc/esproxy/contractimplementations (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                  | Title                   |
| ----------------------------------------- | ----------------------- |
| `/sap/bc/esproxy/contractimplementations` | Contract Implementation |

</details>

### /sap/bc/esproxy/contracts (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                    | Title    |
| --------------------------- | -------- |
| `/sap/bc/esproxy/contracts` | Contract |

</details>

### /sap/bc/esproxy/datatypes (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                    | Title           |
| --------------------------- | --------------- |
| `/sap/bc/esproxy/datatypes` | Proxy Data Type |

</details>

### /sap/bc/esproxy/esrscv (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                 | Title          |
| ------------------------ | -------------- |
| `/sap/bc/esproxy/esrscv` | ESR SCV Search |

</details>

### /sap/bc/esproxy/esrsearch (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                    | Title                                 |
| --------------------------- | ------------------------------------- |
| `/sap/bc/esproxy/esrsearch` | Enterprise Services Repository Search |

</details>

### /sap/bc/esproxy/integrationscenariodefns (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                                   | Title                           |
| ------------------------------------------ | ------------------------------- |
| `/sap/bc/esproxy/integrationscenariodefns` | Integration Scenario Definition |

</details>

### /sap/bc/esproxy/messagetypes (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                       | Title              |
| ------------------------------ | ------------------ |
| `/sap/bc/esproxy/messagetypes` | Proxy Message Type |

</details>

### /sap/bc/esproxy/operationmappings (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                            | Title             |
| ----------------------------------- | ----------------- |
| `/sap/bc/esproxy/operationmappings` | Operation Mapping |

</details>

### /sap/bc/esproxy/proxysearch (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                      | Title                        |
| ----------------------------- | ---------------------------- |
| `/sap/bc/esproxy/proxysearch` | Proxy Specific Browse Search |

</details>

### /sap/bc/esproxy/rfcconsumers (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                       | Title        |
| ------------------------------ | ------------ |
| `/sap/bc/esproxy/rfcconsumers` | RFC Consumer |

</details>

### /sap/bc/esproxy/search (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                 | Title                |
| ------------------------ | -------------------- |
| `/sap/bc/esproxy/search` | Proxy Generic Search |

</details>

### /sap/bc/esproxy/semanticcontracts (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                            | Title             |
| ----------------------------------- | ----------------- |
| `/sap/bc/esproxy/semanticcontracts` | Semantic Contract |

</details>

### /sap/bc/esproxy/serviceconsumers (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                           | Title            |
| ---------------------------------- | ---------------- |
| `/sap/bc/esproxy/serviceconsumers` | Service Consumer |

</details>

### /sap/bc/esproxy/serviceproviders (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                           | Title            |
| ---------------------------------- | ---------------- |
| `/sap/bc/esproxy/serviceproviders` | Service Provider |

</details>

### /sap/bc/esproxy/soamanager (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                     | Title       |
| ---------------------------- | ----------- |
| `/sap/bc/esproxy/soamanager` | SOA Manager |

</details>

### /sap/bc/esproxy/srsearch (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                   | Title                    |
| -------------------------- | ------------------------ |
| `/sap/bc/esproxy/srsearch` | Services Registry Search |

</details>

### /sap/bc/esproxy/validate (1 endpoints)

<details>
<summary>Click to expand</summary>

| Endpoint                   | Title               |
| -------------------------- | ------------------- |
| `/sap/bc/esproxy/validate` | Validate Proxy Name |

</details>
