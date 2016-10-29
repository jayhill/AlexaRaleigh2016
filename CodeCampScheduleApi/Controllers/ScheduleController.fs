namespace CodeCampScheduleApi.Controllers

open System.Web.Http
open ScheduleQuestionHandler

type ScheduleController() =
    inherit ApiController()

    member x.Get speaker topic order =
        base.Ok (createQuestionDetails speaker topic order |> processScheduleQuestion)