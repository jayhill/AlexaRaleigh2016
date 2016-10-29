module ScheduleQuestionHandler

open System
open FSharp.Data

type Data = CsvProvider<"Content\data.csv">
type Talk = Data.Row

type Order = First | Last | Next

type ScheduleQuestion = {
    speaker : string option
    topic : string option
    order : Order option
}

type ResultsHandler = {
    state : string
    formatter : Talk -> string
    results : Talk list
}

let createQuestionDetails =
    let inline clean (s : string) =
        match s with
        | null -> None
        | _ when s.Trim() = "" -> None
        | _ -> Some s
    let inline matchOrder order =
        match clean order with
        | Some (IgnoreCase "first")
        | Some (IgnoreCase "1st") -> Some Order.First
        | Some (IgnoreCase "last") -> Some Order.Last
        | Some (IgnoreCase "next") -> Some Order.Next
        | _ -> None
    fun speaker topic order ->
        {
            speaker = clean speaker
            topic = clean topic
            order = matchOrder order
        }

let processScheduleQuestion =
    let data = Data.Load("Content\data.csv").Rows |> Seq.sortBy (fun x -> x.StartTime) |> Seq.cast<Talk> |> List.ofSeq
    let eventDate = DateTime(2016, 10, 29)

    let rec matchField details (results : Talk list) =
        match results with
        | [] -> []
        | head :: tail ->
            match details with
            | { speaker = Some spkr } ->
                results
                |> List.filter (fun x -> x.Speaker |> String.containsIgnoreCase spkr)
                |> matchField { details with speaker = None }
            | { topic = Some t } -> 
                results
                |> List.filter (fun x -> x.Tags.Split(',') |> Array.exists (String.equalsIgnoreCase t))
                |> matchField { details with topic = None }
            | { order = Some o } ->
                match o with
                | Last -> results |> List.last |> List.singleton
                | First -> [ head ]
                | Next ->
                    let now = DateTime.Now
                    match eventDate - now.Date with
                    | ts when ts = TimeSpan.Zero ->
                        results
                        |> List.filter (fun x -> now.TimeOfDay <= x.StartTime.TimeOfDay)
                        |> List.tryHead
                        |> function
                            | Some head -> [ head ]
                            | _ -> []
                    | ts when ts < TimeSpan.Zero -> []
                    | _ -> [ head ]
            | _ -> results

    let formatTime (time : TimeSpan) =
        let hours = match time.Hours with | h when 12 < h -> h - 12 | h -> h
        sprintf "%i:%s" hours (time.Minutes.ToString().PadLeft(2, '0'))

    let rec handleMultipleResults handler =
        match handler with
        | { results = [] } -> handler.state
        | { results = [ last ] } -> sprintf "%s and %s" handler.state (handler.formatter last)
        | { results = head :: tail } ->
            { handler with
                results = tail
                state = sprintf "%s, %s" handler.state (handler.formatter head) }
            |> handleMultipleResults

    fun slotData ->
        match matchField slotData data with
        | [] ->
            let rec compose data state =
                match data with
                | { topic = Some t } ->
                    state + " about " + t |> compose  { data with topic = None }
                | { speaker = Some s } ->
                    state + " by " + s |> compose { data with speaker = None }
                | { order = Some o } ->
                    match o with
                    | First
                    | Last -> state
                    | Next ->
                        let now = DateTime.Now
                        match eventDate - now.Date with
                        | ts when ts < TimeSpan.Zero -> "Code Camp was on October twenty ninth. There are no more sessions."
                        | _ -> state + " for the rest of the day."
                | _ -> state
            compose slotData "I didn't find any sessions"
        | [ result ] ->
            sprintf "%s is presenting %s at %s in room %i"
                result.Speaker result.Title (formatTime result.StartTime.TimeOfDay) result.Room
        | head :: _ as results when results |> List.forall (fun x -> x.StartTime = head.StartTime) ->
            handleMultipleResults {
                state = sprintf "There are %i sessions at %s. " results.Length (formatTime head.StartTime.TimeOfDay)
                formatter = fun (session : Talk) -> sprintf "%s is presenting %s in room %i" session.Speaker session.Title session.Room
                results = results }
        | head :: _ as results when results |> List.forall (fun x -> x.Speaker = head.Speaker) ->
            handleMultipleResults {
                state = sprintf "%s is giving %i talks: " head.Speaker results.Length
                formatter = fun (session : Talk) -> sprintf "%s at %s in room %i" session.Title (formatTime session.StartTime.TimeOfDay) session.Room
                results = results }
        | head :: _ as results when results |> List.forall (fun x -> x.Room = head.Room) ->
            handleMultipleResults {
                state = sprintf "In room %i" head.Room
                formatter = fun (session : Talk) -> sprintf "at %s, %s is presenting %s" (formatTime session.StartTime.TimeOfDay) session.Speaker session.Title 
                results = results }
        | results ->
            handleMultipleResults {
                state = sprintf "I found %i sessions. " results.Length 
                formatter = fun (session : Talk) ->
                    sprintf "%s is presenting %s at %s in room %i" session.Speaker session.Title (formatTime session.StartTime.TimeOfDay) session.Room
                results = results }