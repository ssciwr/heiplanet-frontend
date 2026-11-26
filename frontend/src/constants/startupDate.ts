import type { Month } from "../component/Mapper/types";

// Date shown when the app starts and used to find a model with data.
// It has to lie within the time range stored in the database (currently 2014-2018).
export const STARTUP_YEAR = 2016;
export const STARTUP_MONTH: Month = 7;
