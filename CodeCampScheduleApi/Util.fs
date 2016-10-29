[<AutoOpen>]
module Util

open System

[<AutoOpen>]
module String =
    let inline equalsIgnoreCase s1 s2 =
        String.Equals(s1, s2, StringComparison.OrdinalIgnoreCase)

    let inline containsIgnoreCase sought (source : string) =
        match source.IndexOf(sought, StringComparison.OrdinalIgnoreCase) with
        | x when x < 0 -> false
        | _ -> true

[<AutoOpen>]
module List =
    let inline containsIgnoreCase s list =
        list |> List.exists (fun x -> String.equalsIgnoreCase x s)

[<AutoOpen>]
module ActivePatterns =

    let (|IgnoreCase|_|) (s1 : string) (s2 : string) =
        match equalsIgnoreCase s1 s2 with
        | true -> Some ()
        | false -> None

    let (|ParseDate|_|) (s : string) =
        match s with
        | null -> None
        | _ ->
            match DateTime.TryParse s with
            | true, dt -> Some dt
            | _ -> None

    let (|ParseTimeSpan|_|) (s : string) =
        match s with
        | null -> None
        | _ ->
            match TimeSpan.TryParse s with
            | true, ts -> Some ts
            | _ -> None