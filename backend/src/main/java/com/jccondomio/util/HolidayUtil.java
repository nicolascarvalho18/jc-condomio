package com.jccondomio.util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.util.HashSet;
import java.util.Set;

public final class HolidayUtil {

    private HolidayUtil() {}

    /**
     * Retorna a data ajustada para o próximo dia útil caso a data informada
     * recaia em um sábado, domingo ou feriado nacional brasileiro.
     */
    public static LocalDate adjustToNextBusinessDay(LocalDate date) {
        LocalDate current = date;
        while (!isBusinessDay(current)) {
            current = current.plusDays(1);
        }
        return current;
    }

    public static boolean isBusinessDay(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return false;
        }
        return !isBrazilianNationalHoliday(date);
    }

    public static boolean isBrazilianNationalHoliday(LocalDate date) {
        int year = date.getYear();
        Set<LocalDate> holidays = getHolidaysForYear(year);
        return holidays.contains(date);
    }

    public static Set<LocalDate> getHolidaysForYear(int year) {
        Set<LocalDate> holidays = new HashSet<>();

        // Feriados Nacionais Fixos
        holidays.add(LocalDate.of(year, Month.JANUARY, 1));   // Confraternização Universal
        holidays.add(LocalDate.of(year, Month.APRIL, 21));    // Tiradentes
        holidays.add(LocalDate.of(year, Month.MAY, 1));       // Dia do Trabalho
        holidays.add(LocalDate.of(year, Month.SEPTEMBER, 7)); // Independência
        holidays.add(LocalDate.of(year, Month.OCTOBER, 12));  // N. Sra. Aparecida
        holidays.add(LocalDate.of(year, Month.NOVEMBER, 2));  // Finados
        holidays.add(LocalDate.of(year, Month.NOVEMBER, 15)); // Proclamação da República
        holidays.add(LocalDate.of(year, Month.NOVEMBER, 20)); // Dia da Consciência Negra (Lei 14.759/2023)
        holidays.add(LocalDate.of(year, Month.DECEMBER, 25)); // Natal

        // Feriados Móveis baseados no Domingo de Páscoa (Algoritmo de Meeus/Jones/Butcher)
        LocalDate easter = calculateEaster(year);
        holidays.add(easter.minusDays(48)); // Segunda-feira de Carnaval
        holidays.add(easter.minusDays(47)); // Terça-feira de Carnaval
        holidays.add(easter.minusDays(2));  // Sexta-feira Santa
        holidays.add(easter.plusDays(60));  // Corpus Christi

        return holidays;
    }

    /**
     * Cálculo do Domingo de Páscoa usando o algoritmo de Meeus/Jones/Butcher (Calendário Gregoriano).
     */
    public static LocalDate calculateEaster(int year) {
        int a = year % 19;
        int b = year / 100;
        int c = year % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;
        int month = (h + l - 7 * m + 114) / 31;
        int day = ((h + l - 7 * m + 114) % 31) + 1;
        return LocalDate.of(year, month, day);
    }
}
