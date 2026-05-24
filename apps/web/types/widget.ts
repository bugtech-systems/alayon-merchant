// types/widget.ts

export type WidgetType = "kpi" | "line" | "bar" | "pie"

export type WidgetSchema = {
  id: string
  type: WidgetType

  title: string
  description?: string

  webhook: {
    url: string
    method?: "GET" | "POST"

    // maps filters → query params
    queryMap?: Record<string, string>

    // maps filters → request body
    bodyMap?: Record<string, string>

    headers?: Record<string, string>
  }

  config?: Record<string, any>
}

export type DashboardFilters = {
  from?: string
  to?: string
  segment?: string
  [key: string]: any
}