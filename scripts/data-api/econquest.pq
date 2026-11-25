// EconQuest data for Excel (Power Query). See docs/DATA_API.md, "Excel".
//
// 1. In Excel: Data > Get Data > From Other Sources > Blank Query, then Home > Advanced Editor.
// 2. Paste this whole file, press Done, and name the query EconQuest.
// 3. Make a second blank query for each table you want, for example:
//        = EconQuest[Series]("BRA", "policy_rate")
//        = EconQuest[Country]("BRA")
//        = EconQuest[Panel]("BRA,MEX", "policy_rate,cpi_monthly", "history")
//        = EconQuest[Figures]("BRA", "2026-06-30")
//    and choose Close & Load. Data > Refresh All fetches the latest saved figures from the app.
//
// Base is where the app runs (Docker: http://localhost:3737). Key is only for a copy with sign-in
// on: the integration API key or a read:data API token. It travels in a header, never in the address.
// Nothing is estimated: a figure the app does not hold comes back empty, with the reason in its row,
// and a series the app does not have stops the refresh with the app's own "Missing" message.
let
    Base = "http://localhost:3000",
    Key = "",

    Headers = if Key = "" then [] else [#"X-SMCR-API-Key" = Key],

    // bom=0 asks the app to leave off the byte order mark, so the first column is iso3.
    Get = (path as text, optional query as nullable record) as table =>
        let
            q = Record.Combine({[bom = "0"], if query = null then [] else query}),
            raw = Web.Contents(Base, [RelativePath = path, Query = q, Headers = Headers, ManualStatusHandling = {400, 404, 429}]),
            status = Value.Metadata(raw)[Response.Status],
            result =
                if status = 200 then
                    Table.PromoteHeaders(Csv.Document(raw, [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]), [PromoteAllScalars = true])
                else
                    let
                        note = try Json.Document(raw) otherwise [message = Text.FromBinary(raw)],
                        msg = if Record.HasFields(note, "message") then note[message] else Text.From(status)
                    in
                        error Error.Record("EconQuest " & Text.From(status), msg)
        in
            result,

    // value becomes a number; an empty value (Missing) stays empty. Every other column stays text.
    Numbers = (t as table) as table =>
        if List.Contains(Table.ColumnNames(t), "value") then
            Table.TransformColumns(t, {{"value", each if _ = null or _ = "" then null else Number.From(_, "en-US"), type nullable number}})
        else
            t,

    Code = (iso as text) as text => Uri.EscapeDataString(Text.Upper(Text.Trim(iso))),

    Series = (iso3 as text, id as text) as table =>
        Numbers(Get("api/export/" & Code(iso3) & "/series/" & Uri.EscapeDataString(id) & ".csv")),

    Country = (iso3 as text) as table =>
        Numbers(Get("api/export/" & Code(iso3) & "/series.csv")),

    World = () as table =>
        Numbers(Get("api/export/world/series.csv")),

    Panel = (countries as text, figures as text, optional mode as nullable text) as table =>
        Numbers(Get("api/export/panel.csv", [countries = countries, figures = figures, mode = if mode = null then "latest" else mode])),

    Figures = (iso3 as text, optional asOf as nullable text) as table =>
        Numbers(Get("api/export/" & Code(iso3) & "/figures.csv", if asOf = null or asOf = "" then null else [asOf = asOf]))
in
    [Series = Series, Country = Country, World = World, Panel = Panel, Figures = Figures]
