import moment, {DurationInputArg2, unitOfTime} from 'moment';
import {GanttColumnBuilder} from './columnBuilder.factory';
// import DurationConstructor = moment.unitOfTime.DurationConstructor

/**
 * Columns are generated including or excluding the to date.
 * If the To date is the first day of month and the time is 00:00 then no new column is generated for this month.
 */
export default class GanttColumnGenerator {
  /**
   * Generates one column for each time unit between the given from and to date.
   *
   * @param builder
   * @param from
   * @param to
   * @param viewScale
   * @param columnWidth
   * @param maximumWidth
   * @param leftOffset
   * @param reverse
   * @returns {Array}
   */
  generate(builder: GanttColumnBuilder, from: moment.Moment, to: moment.Moment, viewScale: string, columnWidth: number, maximumWidth?: number, leftOffset?: number, reverse?: boolean) {
    if (!to && !maximumWidth) {
      throw new Error('to or maximumWidth must be defined');
    }

    viewScale = viewScale.trim();
    if (viewScale.charAt(viewScale.length - 1) === 's') {
      viewScale = viewScale.substring(0, viewScale.length - 1);
    }
    let viewScaleValue: unitOfTime.DurationConstructor;
    let viewScaleUnit: DurationInputArg2;
    let splittedViewScale: string[];

    if (viewScale) {
      splittedViewScale = viewScale.split(' ');
    }
    if (splittedViewScale && splittedViewScale.length > 1) {
      viewScaleValue = parseFloat(splittedViewScale[0]) as any;
      viewScaleUnit = splittedViewScale[splittedViewScale.length - 1] as DurationInputArg2;
    } else {
      viewScaleValue = 1 as any;
      viewScaleUnit = viewScale as DurationInputArg2;
    }

    let excludeTo = false;
    from = moment(from).startOf(viewScaleUnit);
    if (to) {
      excludeTo = this.isToDateToExclude(to, viewScaleValue, viewScaleUnit);
      to = moment(to).startOf(viewScaleUnit);
    }

    let left = 0;
    let date = moment(from).startOf(viewScaleUnit);
    if (reverse) {
      date.subtract(viewScaleValue, viewScaleUnit);
      left -= columnWidth;
    }
    let generatedCols = [];

    while (true) {
      if (maximumWidth && Math.abs(left) > maximumWidth + columnWidth) {
        break;
      }

      let startDate = moment(date);
      let endDate = moment(startDate).add(viewScaleValue, viewScaleUnit);
      this.ensureNoUnitOverflow(viewScaleUnit, startDate, endDate);

      let column = builder.newColumn(startDate, endDate, leftOffset ? left + leftOffset : left, columnWidth);

      if (!column.cropped) {
        generatedCols.push(column);
        if (reverse) {
          left -= columnWidth;
        } else {
          left += columnWidth;
        }
      }
      if (to) {
        if (reverse) {
          if (excludeTo && date < to || !excludeTo && date <= to) {
            break;
          }
        } else {
          if (excludeTo && date > to || !excludeTo && date >= to) {
            break;
          }
        }
      }
      if (reverse) {
        date.subtract(viewScaleValue, viewScaleUnit);
        this.ensureNoUnitOverflow(viewScaleUnit, date, startDate);
      } else {
        date.add(viewScaleValue, viewScaleUnit);
        this.ensureNoUnitOverflow(viewScaleUnit, startDate, date);
      }
    }

    if (reverse) {
      if (this.isToDateToExclude(from, viewScaleValue, viewScaleUnit)) {
        generatedCols.shift();
      }
      generatedCols.reverse();
    }

    return generatedCols;
  }

  isToDateToExclude(to: moment.Moment, value: moment.unitOfTime.DurationConstructor, unit: moment.DurationInputArg2): boolean {
    return moment(to).add(value, unit).startOf(unit) === to;
  }

  private ensureNoUnitOverflow(unit: unitOfTime.All, startDate: moment.Moment, endDate: moment.Moment) {
    let v1 = startDate.get(unit);
    let v2 = endDate.get(unit);
    let firstValue = this.getFirstValue(unit);
    if (firstValue !== undefined && v2 !== firstValue && v2 < v1) {
      endDate.set(unit, firstValue);
    }
  }

  private getFirstValue(unit: unitOfTime.All) {
    if (['hour', 'minute', 'second', 'millisecond'].indexOf(unit) >= 0) {
      return 0;
    }
  }
}
