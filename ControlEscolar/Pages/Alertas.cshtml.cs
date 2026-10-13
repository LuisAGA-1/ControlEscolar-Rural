using ControlEscolar.Models;
using ControlEscolar.Repostories;
using ControlEscolar.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace ControlEscolar.Pages;

public class AlertasModel(EscolarRepository repo) : PageModel
{
    [BindProperty(SupportsGet = true)] public bool Todas { get; set; }
    public List<Alerta> Alertas { get; private set; } = [];

    public async Task OnGetAsync() => Alertas = await repo.AlertasAsync(User.Actual(), Todas);

    public async Task<IActionResult> OnPostAtenderAsync(Guid id)
    {
        if ((await repo.AtenderAlertaAsync(User.Actual(), id)).Count > 0)
            TempData["Mensaje"] = "Alerta marcada como atendida.";
        return RedirectToPage(new { Todas });
    }
}
