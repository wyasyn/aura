"use client"

import {
  IconArrowDown,
  IconArrowUp,
  IconChartLine,
  IconClock,
  IconCoins,
  IconPackage,
  IconUsers,
} from "@tabler/icons-react"
import Link from "next/link"
import type { ComponentType } from "react"

import { FramedPanel } from "@/components/marketing/framed-panel"
import { Button } from "@/components/ui/button"

export type MetricIconType = "chart" | "users" | "product" | "finance"

export interface MetricItem {
  id: string
  label: string
  value: string
  changePercent: number
  icon: MetricIconType
}

export interface ActivityItem {
  id: string
  title: string
  timestamp: string
  value: string
  isPositive: boolean
}

export interface PeriodData {
  id: string
  label: string
  metrics: MetricItem[]
  activities: ActivityItem[]
}

export interface PerformanceOverviewProps {
  title: string
  accentWord: string
  subtitle?: string
  ctaLabel: string
  /** Preferred over onCtaClick: renders a real anchor so the CTA is crawlable. */
  ctaHref?: string
  onCtaClick?: () => void
  periods: PeriodData[]
  defaultPeriodId?: string
}

const metricIconMap: Record<
  MetricIconType,
  ComponentType<{ className?: string }>
> = {
  chart: IconChartLine,
  users: IconUsers,
  product: IconPackage,
  finance: IconCoins,
}

export function PerformanceOverview({
  title,
  accentWord,
  subtitle,
  ctaLabel,
  ctaHref,
  onCtaClick,
  periods,
  defaultPeriodId,
}: PerformanceOverviewProps) {
  const fallbackPeriod = periods[0]?.id
  const activeDefault = defaultPeriodId ?? fallbackPeriod
  const activeData = periods.find((p) => p.id === activeDefault) || periods[0]

  return (
    <section className="bg-muted/30 w-full py-16 md:py-24">
      <div className="mx-auto max-w-[370px] px-4 sm:max-w-2xl sm:px-6 md:max-w-5xl lg:px-8">
        <FramedPanel
          innerClassName="group bg-primary/5 relative isolate flex min-h-[400px] items-center justify-center overflow-hidden px-4 pt-12 lg:h-[450px] lg:px-8 lg:pt-0"
        >
        <div
          aria-hidden
          className="absolute top-1/2 left-[max(-7rem,calc(50%-52rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        >
          <div
            style={{
              clipPath:
                "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
            }}
            className="from-primary to-primary/60 aspect-[577/310] w-[36rem] bg-gradient-to-r opacity-30"
          />
        </div>

        <div
          aria-hidden
          className="absolute top-1/2 left-[max(45rem,calc(50%+8rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        >
          <div
            style={{
              clipPath:
                "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
            }}
            className="from-primary to-primary/60 aspect-[577/310] w-[36rem] bg-gradient-to-r opacity-30"
          />
        </div>

        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
            <h2 className="font-heading text-foreground text-3xl leading-tight font-medium tracking-tight text-balance md:text-4xl">
              {title} <span className="text-primary">{accentWord}</span>
            </h2>
            {subtitle ? (
              <p className="text-muted-foreground max-w-md text-sm leading-relaxed sm:text-base">
                {subtitle}
              </p>
            ) : null}
            <div className="mt-1">
              {ctaHref ? (
                <Button
                  asChild
                  className="h-10 rounded-full px-6 text-sm font-semibold"
                >
                  <Link href={ctaHref}>{ctaLabel}</Link>
                </Button>
              ) : (
                <Button
                  onClick={onCtaClick}
                  className="h-10 rounded-full px-6 text-sm font-semibold"
                >
                  {ctaLabel}
                </Button>
              )}
            </div>
          </div>

          <div className="flex translate-y-[10%] justify-center transition-transform duration-500 ease-out group-hover:translate-y-[5%] lg:translate-y-[35%] lg:justify-end lg:group-hover:translate-y-[10%]">
            <div className="relative mx-auto w-full max-w-[320px]">
              <div className="border-border bg-background relative overflow-hidden rounded-[2.5rem] border-8 shadow-2xl">
                <div className="bg-muted absolute top-2 left-1/2 z-20 h-6 w-24 -translate-x-1/2 rounded-full" />

                <div className="relative h-[480px] overflow-y-auto px-4 pt-12 pb-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                      {activeData?.metrics.map((metric) => {
                        const Icon = metricIconMap[metric.icon]
                        const isPositive = metric.changePercent >= 0

                        return (
                          <div
                            key={metric.id}
                            className="bg-muted/50 border-border/50 hover:bg-muted rounded-2xl border p-3.5 transition-colors"
                          >
                            <div className="mb-3 flex items-center gap-2">
                              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full">
                                <Icon className="size-3.5" aria-hidden />
                              </div>
                              <span className="text-muted-foreground text-xs font-medium">
                                {metric.label}
                              </span>
                            </div>
                            <div className="text-foreground mb-1 text-xl font-bold">
                              {metric.value}
                            </div>
                            <div
                              className={`flex items-center gap-1 text-xs font-semibold ${
                                isPositive ? "text-primary" : "text-destructive"
                              }`}
                            >
                              {isPositive ? (
                                <IconArrowUp className="size-2.5" aria-hidden />
                              ) : (
                                <IconArrowDown className="size-2.5" aria-hidden />
                              )}
                              <span>{Math.abs(metric.changePercent)}%</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div>
                      <h3 className="text-foreground mb-4 text-sm font-semibold">
                        Recent activity
                      </h3>
                      <div className="space-y-3">
                        {activeData?.activities.map((activity) => (
                          <div
                            key={activity.id}
                            className="border-border/50 bg-background flex items-center justify-between rounded-xl border p-3 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-full">
                                <IconClock
                                  className="text-secondary-foreground size-4"
                                  aria-hidden
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-foreground truncate text-sm font-medium">
                                  {activity.title}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {activity.timestamp}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted-foreground/20 absolute bottom-2 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        </FramedPanel>
      </div>
    </section>
  )
}
