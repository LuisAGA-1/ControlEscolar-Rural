using ControlEscolar.Models;
using ControlEscolar.Repostories;
using ControlEscolar.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace ControlEscolar.Pages;

public class AlumnosModel(EscolarRepository repo) : PageModel
{
    [BindProperty(SupportsGet = true)] public string Buscar { get; set; } = string.Empty;
    [BindProperty(SupportsGet = true)] public string Grupo { get; set; } = string.Empty;

    public List<Grupo> Grupos { get; private set; } = [];
    public List<Alumno> Alumnos { get; private set; } = [];

    public async Task OnGetAsync()
    {
        var u = User.Actual();
        Grupos = await repo.GruposAsync(u);
        Alumnos = await repo.AlumnosAsync(u, Buscar ?? "", Grupo ?? "");
    }
}
