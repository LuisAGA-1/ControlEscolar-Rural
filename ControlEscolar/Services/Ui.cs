using System.Globalization;

namespace ControlEscolar.Services;

// Textos de pantalla compartidos por las páginas.
public static class Ui
{
    static readonly CultureInfo Es = new("es-MX");
    static readonly string[] Dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

    public static string DiaDeHoy => Dias[(int)DateTime.Now.DayOfWeek];
    public static string FechaLarga(DateTime d) { var t = d.ToString("dddd d 'de' MMMM 'de' yyyy", Es); return char.ToUpper(t[0]) + t[1..]; }
    public static string FechaCorta(DateOnly d) => d.ToString("ddd d MMM", Es);
    public static string Dia(string dia) => dia == "miercoles" ? "Miércoles" : Es.TextInfo.ToTitleCase(dia);

    public static string Saludo => DateTime.Now.Hour switch { < 12 => "Buenos días", < 19 => "Buenas tardes", _ => "Buenas noches" };

    public static string Iniciales(string nombre) =>
        string.Concat(nombre.Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(2).Select(p => char.ToUpper(p[0])));

    public static string Rol(string rol) => rol switch { "docente" => "Docente", "director" => "Dirección", _ => "Administración" };

    public static string TipoAlerta(string tipo) => tipo switch
    {
        "faltas_consecutivas" => "Faltas consecutivas",
        "inasistencia_mensual" => "Inasistencia mensual",
        _ => "Bajo promedio",
    };

    public static readonly (string Valor, string Letra, string Texto)[] Estados =
    [
        ("presente", "P", "Presente"), ("falta", "F", "Falta"), ("retardo", "R", "Retardo"), ("justificada", "J", "Justificada"),
    ];
}
