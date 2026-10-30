using ControlEscolar.Models;
using ControlEscolar.Repostories;
using ControlEscolar.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace ControlEscolar.Pages;

public class HorarioModel(EscolarRepository repo) : PageModel
{
    public static readonly string[] Dias = ["lunes", "martes", "miercoles", "jueves", "viernes"];
    [BindProperty(SupportsGet = true)] public string Grupo { get; set; } = string.Empty;
    public bool Docente { get; private set; }
    public List<Grupo> Grupos { get; private set; } = [];
    public List<ClaseHorario> Clases { get; private set; } = [];

    public async Task OnGetAsync()
    {
        var u = User.Actual();
        Docente = u.Rol == "docente";
        Grupos = await repo.GruposAsync(u);
        // El director no da clases: le mostramos un grupo a la vez (toda la escuela no cabe en una semana)
        if (!Docente && string.IsNullOrEmpty(Grupo) && Grupos.Count > 0) Grupo = Grupos[0].Id.ToString();
        Clases = await repo.HorarioAsync(u, grupo: Grupo ?? "");
    }
}
