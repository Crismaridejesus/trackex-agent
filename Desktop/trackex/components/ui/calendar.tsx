"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({className, classNames, showOutsideDays = true,...props}: CalendarProps){
    return (
        <DayPicker 
            animate 
            showOutsideDays={showOutsideDays}
            className={cn("p-3 relative", className)}
            classNames={{
                ...classNames,
                today: "text-primary font-bold",
                selected: "",
                range_start: "bg-primary rounded-md text-white",
                range_end: "bg-primary rounded-md text-white",
                chevron: "text-primary",
            }}
            {...props}
            />
    )
}
Calendar.displayName = "Calendar";

export { Calendar };
