"use client"

import * as React from "react"
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AdvancedDateRangePickerProps {
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  className?: string
  placeholder?: string
}

interface PresetFilter {
  label: string
  value: string
  getValue: () => DateRange
}

const PRESET_FILTERS: PresetFilter[] = [
  {
    label: "Today",
    value: "today",
    getValue: () => {
      const today = new Date()
      return {
        from: startOfDay(today),
        to: endOfDay(today),
      }
    },
  },
  {
    label: "Yesterday",
    value: "yesterday",
    getValue: () => {
      const yesterday = subDays(new Date(), 1)
      return {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
      }
    },
  },
  {
    label: "This Week",
    value: "thisWeek",
    getValue: () => {
      const now = new Date()
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
      // Don't go beyond today
      const endDate = weekEnd > now ? now : weekEnd
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        to: endOfDay(endDate),
      }
    },
  },
  {
    label: "Last 7 Days",
    value: "last7Days",
    getValue: () => {
      const now = new Date()
      return {
        from: startOfDay(subDays(now, 6)),
        to: endOfDay(now),
      }
    },
  },
  {
    label: "Previous Week",
    value: "previousWeek",
    getValue: () => {
      const now = new Date()
      const lastWeek = subDays(now, 7)
      return {
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      }
    },
  },
  {
    label: "This Month",
    value: "thisMonth",
    getValue: () => {
      const now = new Date()
      const monthEnd = endOfMonth(now)
      // Don't go beyond today
      const endDate = monthEnd > now ? now : monthEnd
      return {
        from: startOfMonth(now),
        to: endOfDay(endDate),
      }
    },
  },
  {
    label: "Previous Month",
    value: "previousMonth",
    getValue: () => {
      const now = new Date()
      const lastMonth = subMonths(now, 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      }
    },
  },
  {
    label: "Last 3 Months",
    value: "last3Months",
    getValue: () => {
      const now = new Date()
      // Don't go beyond today
      return {
        from: startOfMonth(subMonths(now, 2)),
        to: endOfDay(now),
      }
    },
  },
  {
    label: "Last 6 Months",
    value: "last6Months",
    getValue: () => {
      const now = new Date()
      // Don't go beyond today
      return {
        from: startOfMonth(subMonths(now, 5)),
        to: endOfDay(now),
      }
    },
  },
]

export function AdvancedDateRangePicker({
  date,
  onDateChange,
  className,
  placeholder = "Pick a date range",
}: Readonly<AdvancedDateRangePickerProps>) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)
  const [selectedPreset, setSelectedPreset] = React.useState<string>("")
  const [currentMonth, setCurrentMonth] = React.useState<Date>(date?.from || new Date())

  React.useEffect(() => {
    setTempDate(date)
    if (date?.from) {
      setCurrentMonth(date.from)
    }
  }, [date])

  const handlePresetSelect = (presetValue: string) => {
    const preset = PRESET_FILTERS.find(p => p.value === presetValue)
    if (preset) {
      const newRange = preset.getValue()
      setTempDate(newRange)
      setSelectedPreset(presetValue)
    }
  }

  const handleDateSelect = (range: DateRange | undefined) => {
    setTempDate(range)
    setSelectedPreset("") // Clear preset when manually selecting dates
    
    // Update current month to show the selected date
    if (range?.from) {
      setCurrentMonth(range.from)
    }
  }

  const handleApply = () => {
    onDateChange?.(tempDate)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempDate(date)
    setSelectedPreset("")
    setIsOpen(false)
  }

  const handleClear = () => {
    const today = new Date()
    const todayRange = {
      from: startOfDay(today),
      to: endOfDay(today),
    }
    setTempDate(todayRange)
    setSelectedPreset("")
    onDateChange?.(todayRange)
  }

  const isToday = (range: DateRange | undefined) => {
    if (!range?.from) return false
    
    const today = new Date()
    const todayStr = format(today, "yyyy-MM-dd")
    
    // Check if it's a single day selection (no 'to' date or same day)
    if (!range.to || format(range.from, "yyyy-MM-dd") === format(range.to, "yyyy-MM-dd")) {
      return format(range.from, "yyyy-MM-dd") === todayStr
    }
    
    // For date ranges, check if it includes today and is just today
    const fromStr = format(range.from, "yyyy-MM-dd")
    const toStr = format(range.to, "yyyy-MM-dd")
    
    return fromStr === todayStr && toStr === todayStr
  }

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return placeholder
    
    // If there's no 'to' date or if 'from' and 'to' are the same day, show single date
    if (!range.to || 
        (range.from && range.to && 
         format(range.from, "yyyy-MM-dd") === format(range.to, "yyyy-MM-dd"))) {
      return format(range.from, "MMM d, yyyy")
    }
    
    // Show range for different dates
    return `${format(range.from, "MMM d, yyyy")} → ${format(range.to, "MMM d, yyyy")}`
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[320px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(date)}
            {date && !isToday(date) && (
              <X 
                className="ml-auto h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Calendar Section */}
            <div className="p-4 border-r">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm">CALENDAR</h4>
                <Select defaultValue="UTC">
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Employees' Time Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="EST">Eastern Time</SelectItem>
                    <SelectItem value="PST">Pacific Time</SelectItem>
                    <SelectItem value="CST">Central Time</SelectItem>
                    <SelectItem value="MST">Mountain Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* <Calendar
                mode="range"
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                selected={tempDate}
                onSelect={handleDateSelect}
                numberOfMonths={1}
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                className="rounded-md border-0"
              /> */}
              <Calendar
                mode="range"
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                selected={tempDate}
                onSelect={handleDateSelect}
                numberOfMonths={1}
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                className="rounded-md border-0"
              />
            </div>

            {/* Preset Filters Section */}
            <div className="p-4 w-[200px]">
              <h4 className="font-semibold text-sm mb-3">Preset Filters</h4>
              <div className="space-y-1">
                {PRESET_FILTERS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                      selectedPreset === preset.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 p-4 border-t">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
