package com.jccondomio;

import com.jccondomio.util.HolidayUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class HolidayUtilTest {

    @Test
    @DisplayName("Prorrogar final de semana para segunda-feira subsequente")
    void testWeekendRollsOverToMonday() {
        // 12/09/2026 é Sábado
        LocalDate saturday = LocalDate.of(2026, 9, 12);
        assertEquals(DayOfWeek.SATURDAY, saturday.getDayOfWeek());

        LocalDate adjusted = HolidayUtil.adjustToNextBusinessDay(saturday);
        assertEquals(LocalDate.of(2026, 9, 14), adjusted);
        assertEquals(DayOfWeek.MONDAY, adjusted.getDayOfWeek());

        // 13/09/2026 é Domingo
        LocalDate sunday = LocalDate.of(2026, 9, 13);
        assertEquals(DayOfWeek.SUNDAY, sunday.getDayOfWeek());

        LocalDate adjustedSunday = HolidayUtil.adjustToNextBusinessDay(sunday);
        assertEquals(LocalDate.of(2026, 9, 14), adjustedSunday);
    }

    @Test
    @DisplayName("Identificar feriados nacionais fixos brasileiros")
    void testNationalHolidaysFixed() {
        // 01/01 Confraternização Universal
        assertFalse(HolidayUtil.isBusinessDay(LocalDate.of(2026, 1, 1)));
        // 21/04 Tiradentes
        assertFalse(HolidayUtil.isBusinessDay(LocalDate.of(2026, 4, 21)));
        // 01/05 Dia do Trabalho
        assertFalse(HolidayUtil.isBusinessDay(LocalDate.of(2026, 5, 1)));
        // 07/09 Independência
        assertFalse(HolidayUtil.isBusinessDay(LocalDate.of(2026, 9, 7)));
        // 12/10 N. Sra. Aparecida
        assertFalse(HolidayUtil.isBusinessDay(LocalDate.of(2026, 10, 12)));
        // 02/11 Finados
        assertFalse(HolidayUtil.isBusinessDay(LocalDate.of(2026, 11, 2)));
        // 15/11 Proclamação da República
        assertFalse(HolidayUtil.isBusinessDay(LocalDate.of(2026, 11, 15)));
        // 20/11 Consciência Negra (Lei nº 14.759/2023)
        assertFalse(HolidayUtil.isBusinessDay(LocalDate.of(2026, 11, 20)));
        // 25/12 Natal
        assertFalse(HolidayUtil.isBusinessDay(LocalDate.of(2026, 12, 25)));
    }

    @Test
    @DisplayName("Prorrogar feriado fixo para o próximo dia útil")
    void testHolidayRollsOver() {
        // 25/12/2026 é uma Sexta-feira (Natal). O próximo dia útil não pode ser sábado nem domingo, deve ser segunda 28/12!
        LocalDate christmas = LocalDate.of(2026, 12, 25);
        LocalDate adjusted = HolidayUtil.adjustToNextBusinessDay(christmas);
        assertEquals(LocalDate.of(2026, 12, 28), adjusted);
        assertEquals(DayOfWeek.MONDAY, adjusted.getDayOfWeek());
    }

    @Test
    @DisplayName("Identificar feriados móveis calculados (Sexta-feira Santa e Corpus Christi)")
    void testMobileHolidays() {
        // Páscoa de 2026: 05 de Abril de 2026
        // Sexta-feira Santa: 03 de Abril de 2026
        LocalDate goodFriday = LocalDate.of(2026, 4, 3);
        assertFalse(HolidayUtil.isBusinessDay(goodFriday));

        // Corpus Christi: 04 de Junho de 2026 (quinta-feira)
        LocalDate corpusChristi = LocalDate.of(2026, 6, 4);
        assertFalse(HolidayUtil.isBusinessDay(corpusChristi));

        LocalDate adjustedCorpus = HolidayUtil.adjustToNextBusinessDay(corpusChristi);
        assertEquals(LocalDate.of(2026, 6, 5), adjustedCorpus); // Sexta-feira
    }
}
